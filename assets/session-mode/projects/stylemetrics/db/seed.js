import db, { initSchema } from './index.js';
import { ensureDemoAccount, DEMO } from './bootstrap.js';

const RESET = process.argv.includes('--reset');

// A small deterministic PRNG so seed data is stable between runs.
let _s = 20260723;
function rand() {
  _s = (_s * 1103515245 + 12345) & 0x7fffffff;
  return _s / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));

function run() {
  initSchema();

  if (RESET) {
    db.exec('DELETE FROM sales; DELETE FROM products; DELETE FROM users;');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('sales','products','users');");
    console.log('Existing data cleared.');
  }

  const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (productCount > 0 && !RESET) {
    console.log('Database already seeded. Use `npm run reset` to rebuild.');
    return;
  }

  // ---- Demo user -------------------------------------------------------
  if (ensureDemoAccount()) {
    console.log(`Demo user created →  ${DEMO.email} / ${DEMO.password}`);
  }

  // ---- Products --------------------------------------------------------
  const categories = ['Outerwear', 'Tops', 'Bottoms', 'Dresses', 'Footwear', 'Accessories', 'Knitwear'];
  const genders = ['Women', 'Men', 'Unisex'];
  const seasons = ['SS26', 'FW25', 'SS25', 'Core'];
  const colors = ['Black', 'Ivory', 'Navy', 'Camel', 'Olive', 'Burgundy', 'Grey', 'Sky Blue'];
  const nameParts = {
    Outerwear: ['Trench Coat', 'Puffer Jacket', 'Wool Blazer', 'Parka', 'Denim Jacket'],
    Tops: ['Silk Blouse', 'Cotton Tee', 'Oxford Shirt', 'Poplin Shirt', 'Tank Top'],
    Bottoms: ['Tailored Trouser', 'Wide Jean', 'Pleated Skirt', 'Cargo Pant', 'Chino'],
    Dresses: ['Slip Dress', 'Shirt Dress', 'Midi Dress', 'Wrap Dress', 'Knit Dress'],
    Footwear: ['Leather Loafer', 'Chelsea Boot', 'Canvas Sneaker', 'Strappy Heel', 'Derby Shoe'],
    Accessories: ['Leather Belt', 'Silk Scarf', 'Structured Tote', 'Card Holder', 'Bucket Hat'],
    Knitwear: ['Merino Sweater', 'Cashmere Cardigan', 'Ribbed Turtleneck', 'Cable Knit', 'Mohair Jumper'],
  };
  const channels = ['Online', 'Retail', 'Wholesale', 'Marketplace'];

  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, category, gender, season, color, price, cost)
    VALUES (@sku, @name, @category, @gender, @season, @color, @price, @cost)
  `);

  const products = [];
  let skuNum = 1000;
  for (const category of categories) {
    const perCategory = intBetween(6, 9);
    for (let i = 0; i < perCategory; i++) {
      const base = pick(nameParts[category]);
      const color = pick(colors);
      const price = Math.round(between(29, 490) / 5) * 5 - 0.01;
      const cost = Math.round(price * between(0.32, 0.55) * 100) / 100;
      const p = {
        sku: `SM-${skuNum++}`,
        name: `${color} ${base}`,
        category,
        gender: pick(genders),
        season: pick(seasons),
        color,
        price,
        cost,
      };
      const info = insertProduct.run(p);
      products.push({ id: info.lastInsertRowid, ...p });
    }
  }
  console.log(`${products.length} products created.`);

  // ---- Sales (daily rows for the last 180 days) ------------------------
  const insertSale = db.prepare(`
    INSERT INTO sales (product_id, sale_date, channel, units, returns, revenue, views)
    VALUES (@product_id, @sale_date, @channel, @units, @returns, @revenue, @views)
  `);

  const DAYS = 180;
  const today = new Date('2026-07-23T00:00:00Z');

  // Give every product an intrinsic popularity + slight trend so charts look real.
  const popularity = products.map(() => between(0.2, 1.6));
  const trend = products.map(() => between(-0.25, 0.55));

  db.exec('BEGIN');
  try {
    for (let d = DAYS - 1; d >= 0; d--) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - d);
      const iso = date.toISOString().slice(0, 10);
      const dow = date.getUTCDay();
      const weekendBoost = dow === 0 || dow === 6 ? 1.35 : 1.0;
      const progress = (DAYS - d) / DAYS; // 0 → 1 across the window

      products.forEach((p, idx) => {
        // Not every product sells every day.
        if (rand() > 0.55 * Math.min(1.4, popularity[idx])) return;

        const seasonMult = p.season === 'SS26' ? 1.25 : p.season === 'FW25' ? 0.85 : 1.0;
        const trendMult = 1 + trend[idx] * progress;
        const demand = popularity[idx] * seasonMult * trendMult * weekendBoost;

        const units = Math.max(1, Math.round(between(1, 9) * demand));
        const returns = rand() < 0.18 ? intBetween(0, Math.max(1, Math.round(units * 0.25))) : 0;
        const netUnits = Math.max(0, units - returns);
        const revenue = Math.round(netUnits * p.price * 100) / 100;
        const views = units * intBetween(18, 60) + intBetween(5, 40);
        const channel = pick(channels);

        insertSale.run({
          product_id: p.id,
          sale_date: iso,
          channel,
          units,
          returns,
          revenue,
          views,
        });
      });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const salesCount = db.prepare('SELECT COUNT(*) AS n FROM sales').get().n;
  console.log(`${salesCount} daily sales rows created across ${DAYS} days.`);
  console.log('Seed complete.');
}

run();
