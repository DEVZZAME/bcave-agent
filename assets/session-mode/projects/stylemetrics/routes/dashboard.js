import express from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// All analytics are anchored to the latest sale date in the DB so that
// ranges always contain data regardless of the real-world clock.
function anchorDate() {
  const row = db.prepare('SELECT MAX(sale_date) AS d FROM sales').get();
  return row?.d || new Date().toISOString().slice(0, 10);
}

function parseDays(req) {
  const allowed = [7, 30, 90, 180];
  const d = parseInt(req.query.days, 10);
  return allowed.includes(d) ? d : 30;
}

function cutoff(anchor, days) {
  return db.prepare("SELECT date(?, ?) AS d").get(anchor, `-${days} days`).d;
}

const pct = (curr, prev) => {
  if (!prev) return curr ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
};

// ---- KPI summary with period-over-period deltas -----------------------
router.get('/summary', (req, res) => {
  const days = parseDays(req);
  const anchor = anchorDate();
  const curFrom = cutoff(anchor, days);
  const prevFrom = cutoff(anchor, days * 2);

  const agg = db.prepare(`
    SELECT
      COALESCE(SUM(s.revenue), 0)                              AS revenue,
      COALESCE(SUM(s.units), 0)                                AS units,
      COALESCE(SUM(s.returns), 0)                              AS returns,
      COALESCE(SUM(s.views), 0)                                AS views,
      COALESCE(SUM((p.price - p.cost) * (s.units - s.returns)), 0) AS margin
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.sale_date > ? AND s.sale_date <= ?
  `);

  const cur = agg.get(curFrom, anchor);
  const prev = agg.get(prevFrom, curFrom);

  const build = (a) => {
    const returnRate = a.units ? (a.returns / a.units) * 100 : 0;
    const conversion = a.views ? (a.units / a.views) * 100 : 0;
    const marginPct = a.revenue ? (a.margin / a.revenue) * 100 : 0;
    return {
      revenue: a.revenue,
      units: a.units,
      returns: a.returns,
      returnRate: Math.round(returnRate * 10) / 10,
      conversion: Math.round(conversion * 100) / 100,
      margin: a.margin,
      marginPct: Math.round(marginPct * 10) / 10,
    };
  };

  const c = build(cur);
  const p = build(prev);

  res.json({
    range: { days, from: curFrom, to: anchor },
    kpis: {
      revenue: { value: c.revenue, delta: pct(c.revenue, p.revenue) },
      units: { value: c.units, delta: pct(c.units, p.units) },
      margin: { value: c.margin, deltaPct: c.marginPct, delta: pct(c.margin, p.margin) },
      returnRate: { value: c.returnRate, delta: pct(c.returnRate, p.returnRate) },
      conversion: { value: c.conversion, delta: pct(c.conversion, p.conversion) },
    },
  });
});

// ---- Daily revenue + units trend --------------------------------------
router.get('/revenue-trend', (req, res) => {
  const days = parseDays(req);
  const anchor = anchorDate();
  const from = cutoff(anchor, days);
  const rows = db.prepare(`
    SELECT s.sale_date AS date,
           SUM(s.revenue) AS revenue,
           SUM(s.units)   AS units
    FROM sales s
    WHERE s.sale_date > ? AND s.sale_date <= ?
    GROUP BY s.sale_date
    ORDER BY s.sale_date ASC
  `).all(from, anchor);
  res.json({ points: rows });
});

// ---- Revenue by category (with margin / returns / conversion) ---------
router.get('/category-breakdown', (req, res) => {
  const days = parseDays(req);
  const anchor = anchorDate();
  const from = cutoff(anchor, days);
  const rows = db.prepare(`
    SELECT p.category AS label,
           SUM(s.revenue) AS revenue,
           SUM(s.units)   AS units,
           SUM(s.returns) AS returns,
           SUM((p.price - p.cost) * (s.units - s.returns)) AS margin,
           CASE WHEN SUM(s.units) > 0
                THEN ROUND(100.0 * SUM(s.returns) / SUM(s.units), 1) ELSE 0 END AS return_rate,
           CASE WHEN SUM(s.views) > 0
                THEN ROUND(100.0 * SUM(s.units) / SUM(s.views), 2) ELSE 0 END AS conversion
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.sale_date > ? AND s.sale_date <= ?
    GROUP BY p.category
    ORDER BY revenue DESC
  `).all(from, anchor);
  res.json({ segments: rows });
});

// ---- Revenue by sales channel (with margin / returns / conversion) ----
router.get('/channel-breakdown', (req, res) => {
  const days = parseDays(req);
  const anchor = anchorDate();
  const from = cutoff(anchor, days);
  const rows = db.prepare(`
    SELECT s.channel AS label,
           SUM(s.revenue) AS revenue,
           SUM(s.units)   AS units,
           SUM(s.returns) AS returns,
           SUM((p.price - p.cost) * (s.units - s.returns)) AS margin,
           CASE WHEN SUM(s.units) > 0
                THEN ROUND(100.0 * SUM(s.returns) / SUM(s.units), 1) ELSE 0 END AS return_rate,
           CASE WHEN SUM(s.views) > 0
                THEN ROUND(100.0 * SUM(s.units) / SUM(s.views), 2) ELSE 0 END AS conversion
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.sale_date > ? AND s.sale_date <= ?
    GROUP BY s.channel
    ORDER BY revenue DESC
  `).all(from, anchor);
  res.json({ segments: rows });
});

// ---- Top products by revenue ------------------------------------------
router.get('/top-products', (req, res) => {
  const days = parseDays(req);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const anchor = anchorDate();
  const from = cutoff(anchor, days);
  const rows = db.prepare(`
    SELECT p.id, p.sku, p.name, p.category,
           SUM(s.revenue) AS revenue,
           SUM(s.units)   AS units
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.sale_date > ? AND s.sale_date <= ?
    GROUP BY p.id
    ORDER BY revenue DESC
    LIMIT ?
  `).all(from, anchor, limit);
  res.json({ products: rows });
});

// ---- Distinct filter values -------------------------------------------
router.get('/filters', (req, res) => {
  const col = (c) => db.prepare(`SELECT DISTINCT ${c} AS v FROM products ORDER BY ${c}`).all().map((r) => r.v);
  res.json({
    categories: col('category'),
    genders: col('gender'),
    seasons: col('season'),
  });
});

// ---- Full product performance table (filter + sort) -------------------
router.get('/products', (req, res) => {
  const days = parseDays(req);
  const anchor = anchorDate();
  const from = cutoff(anchor, days);

  const where = ['s.sale_date > ?', 's.sale_date <= ?'];
  const params = [from, anchor];

  for (const key of ['category', 'gender', 'season']) {
    if (req.query[key]) {
      where.push(`p.${key} = ?`);
      params.push(req.query[key]);
    }
  }

  const sortMap = {
    revenue: 'revenue',
    units: 'units',
    margin: 'margin',
    returnRate: 'return_rate',
    name: 'p.name',
  };
  const sort = sortMap[req.query.sort] || 'revenue';
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';

  const rows = db.prepare(`
    SELECT p.id, p.sku, p.name, p.category, p.gender, p.season, p.color, p.price,
           SUM(s.units)   AS units,
           SUM(s.returns) AS returns,
           SUM(s.revenue) AS revenue,
           SUM((p.price - p.cost) * (s.units - s.returns)) AS margin,
           CASE WHEN SUM(s.units) > 0
                THEN ROUND(100.0 * SUM(s.returns) / SUM(s.units), 1) ELSE 0 END AS return_rate,
           CASE WHEN SUM(s.views) > 0
                THEN ROUND(100.0 * SUM(s.units) / SUM(s.views), 2) ELSE 0 END AS conversion
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE ${where.join(' AND ')}
    GROUP BY p.id
    ORDER BY ${sort} ${dir}
  `).all(...params);

  res.json({ products: rows, count: rows.length });
});

export default router;
