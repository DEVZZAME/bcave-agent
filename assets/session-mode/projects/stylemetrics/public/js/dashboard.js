// ---------- State ----------
const state = {
  view: 'overview',
  days: 30,
  sort: 'revenue',
  dir: 'desc',
  filters: { category: '', gender: '', season: '' },
};
const charts = {};

// ---------- i18n maps ----------
const T_CAT = { Outerwear: '아우터', Tops: '상의', Bottoms: '하의', Dresses: '원피스', Footwear: '신발', Accessories: '액세서리', Knitwear: '니트' };
const T_GENDER = { Women: '여성', Men: '남성', Unisex: '공용' };
const T_CHANNEL = { Online: '온라인', Retail: '매장', Wholesale: '도매', Marketplace: '마켓플레이스' };
const tCat = (v) => T_CAT[v] || v;
const tGender = (v) => T_GENDER[v] || v;
const tChannel = (v) => T_CHANNEL[v] || v;

const VIEW_TITLES = { overview: '상품 성과', products: '상품 상세', categories: '카테고리 분석', channels: '채널 분석' };

// ---------- Helpers ----------
const $ = (s) => document.querySelector(s);
const api = (path) => fetch(path, { credentials: 'same-origin' }).then((r) => {
  if (r.status === 401) { window.location.href = '/'; throw new Error('unauth'); }
  return r.json();
});

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const moneyK = (n) => n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + Math.round(n);
const num = (n) => Math.round(n).toLocaleString('en-US');
const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

function deltaBadge(delta, invert = false) {
  if (delta === 0 || delta === undefined || delta === null) return '<span class="delta flat">—</span>';
  const good = invert ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? '▲' : '▼';
  return `<span class="delta ${good ? 'up' : 'down'}">${arrow} ${Math.abs(delta)}%</span>`;
}

function upsert(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($(id).getContext('2d'), config);
}

// ---------- Boot ----------
init();
async function init() {
  try {
    const { user } = await api('/api/auth/me');
    $('#user-name').textContent = user.name;
    $('#user-email').textContent = user.email;
    $('#user-avatar').textContent = (user.name || '?').trim().charAt(0).toUpperCase();
  } catch { return; }

  await loadFilters();
  bindEvents();
  render();
}

function bindEvents() {
  $('#logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/';
  });

  // Sidebar navigation → switch views
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      state.view = item.dataset.view;
      render();
    });
  });

  // Date range
  $('#range-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    $('#range-toggle').querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.days = parseInt(btn.dataset.days, 10);
    render();
  });

  // Product filters (products view)
  ['category', 'gender', 'season'].forEach((k) => {
    $(`#f-${k}`).addEventListener('change', (e) => {
      state.filters[k] = e.target.value;
      loadProductTable();
    });
  });

  // Product table sorting
  document.querySelectorAll('#product-table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sort === key) state.dir = state.dir === 'desc' ? 'asc' : 'desc';
      else { state.sort = key; state.dir = 'desc'; }
      document.querySelectorAll('#product-table th').forEach((h) => h.classList.remove('sorted-desc', 'sorted-asc'));
      th.classList.add(state.dir === 'desc' ? 'sorted-desc' : 'sorted-asc');
      loadProductTable();
    });
  });
}

async function loadFilters() {
  const f = await api('/api/dashboard/filters');
  const fill = (id, values, labelFn) => {
    const sel = $(id);
    values.forEach((v) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(o);
    });
  };
  fill('#f-category', f.categories, tCat);
  fill('#f-gender', f.genders, tGender);
  fill('#f-season', f.seasons);
}

// ---------- View dispatch ----------
function render() {
  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + state.view));
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.view === state.view));
  $('#view-title').textContent = VIEW_TITLES[state.view];

  if (state.view === 'overview') renderOverview();
  else if (state.view === 'products') renderProducts();
  else if (state.view === 'categories') renderCategories();
  else if (state.view === 'channels') renderChannels();
  else return;
  setSubtitle();
}

async function setSubtitle() {
  const d = await api(`/api/dashboard/summary?days=${state.days}`);
  $('#range-label').textContent = `${d.range.from} → ${d.range.to}  ·  최근 ${d.range.days}일 (이전 ${d.range.days}일 대비)`;
  return d;
}

// ---------- Overview ----------
async function renderOverview() {
  const [summary, trend, cat, chan, top] = await Promise.all([
    api(`/api/dashboard/summary?days=${state.days}`),
    api(`/api/dashboard/revenue-trend?days=${state.days}`),
    api(`/api/dashboard/category-breakdown?days=${state.days}`),
    api(`/api/dashboard/channel-breakdown?days=${state.days}`),
    api(`/api/dashboard/top-products?days=${state.days}&limit=8`),
  ]);
  renderKpis(summary.kpis);
  renderTrend('#trendChart', trend.points);
  renderDoughnut('#ovCategoryChart', cat.segments, tCat);
  renderDoughnut('#ovChannelChart', chan.segments, tChannel);
  renderHBar('#ovTopChart', top.products.map((p) => ({ label: p.name, revenue: p.revenue })));
}

function renderKpis(k) {
  const cards = [
    { label: '매출', value: money(k.revenue.value), delta: k.revenue.delta },
    { label: '판매 수량', value: num(k.units.value) + '개', delta: k.units.delta },
    { label: '매출총이익', value: money(k.margin.value), delta: k.margin.delta, sub: `매출의 ${k.margin.deltaPct}%` },
    { label: '반품률', value: k.returnRate.value + '%', delta: k.returnRate.delta, invert: true },
    { label: '전환율', value: k.conversion.value + '%', delta: k.conversion.delta },
  ];
  $('#kpi-grid').innerHTML = cards.map((c) => `
    <div class="card kpi">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-foot">${deltaBadge(c.delta, c.invert)} ${c.sub ? `<span class="kpi-sub">${c.sub}</span>` : ''}</div>
    </div>`).join('');
}

// ---------- Products ----------
async function renderProducts() {
  const top = await api(`/api/dashboard/top-products?days=${state.days}&limit=12`);
  renderHBar('#prodTopChart', top.products.map((p) => ({ label: p.name, revenue: p.revenue })));
  await loadProductTable();
}

async function loadProductTable() {
  const q = new URLSearchParams({ days: state.days, sort: state.sort, dir: state.dir });
  Object.entries(state.filters).forEach(([k, v]) => v && q.set(k, v));
  const { products } = await api(`/api/dashboard/products?${q}`);
  const tbody = $('#product-tbody');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">선택한 조건에 해당하는 판매 데이터가 없습니다.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map((p) => `
    <tr>
      <td>
        <div class="prod-name">${p.name}</div>
        <div class="prod-sku">${p.sku} · ${tGender(p.gender)} · ${p.season}</div>
      </td>
      <td><span class="pill">${tCat(p.category)}</span></td>
      <td class="num">${num(p.units)}</td>
      <td class="num ${p.return_rate > 15 ? 'warn' : ''}">${p.return_rate}%</td>
      <td class="num strong">${money(p.revenue)}</td>
      <td class="num">${money(p.margin)}</td>
      <td class="num">${p.conversion}%</td>
    </tr>`).join('');
}

// ---------- Categories ----------
async function renderCategories() {
  const { segments } = await api(`/api/dashboard/category-breakdown?days=${state.days}`);
  renderDoughnut('#catChart', segments, tCat);
  renderHBar('#catBarChart', segments.map((s) => ({ label: tCat(s.label), revenue: s.revenue })));
  renderBreakdownTable('#cat-tbody', segments, tCat);
}

// ---------- Channels ----------
async function renderChannels() {
  const { segments } = await api(`/api/dashboard/channel-breakdown?days=${state.days}`);
  renderDoughnut('#chanChart', segments, tChannel);
  renderHBar('#chanBarChart', segments.map((s) => ({ label: tChannel(s.label), revenue: s.revenue })));
  renderBreakdownTable('#chan-tbody', segments, tChannel);
}

function renderBreakdownTable(tbodyId, segments, tr) {
  const total = segments.reduce((sum, s) => sum + s.revenue, 0) || 1;
  $(tbodyId).innerHTML = segments.map((s) => `
    <tr>
      <td><span class="pill">${tr(s.label)}</span></td>
      <td class="num strong">${money(s.revenue)}</td>
      <td class="num">${(100 * s.revenue / total).toFixed(1)}%</td>
      <td class="num">${num(s.units)}</td>
      <td class="num">${money(s.margin)}</td>
      <td class="num ${s.return_rate > 15 ? 'warn' : ''}">${s.return_rate}%</td>
      <td class="num">${s.conversion}%</td>
    </tr>`).join('');
}

// ---------- Chart renderers ----------
function renderTrend(id, points) {
  const labels = points.map((p) => p.date.slice(5));
  upsert(id, {
    data: {
      labels,
      datasets: [
        {
          type: 'line', label: '매출', yAxisID: 'y',
          data: points.map((p) => p.revenue),
          borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.12)',
          fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2,
        },
        {
          type: 'bar', label: '수량', yAxisID: 'y1',
          data: points.map((p) => p.units),
          backgroundColor: 'rgba(236,72,153,.35)', borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: (c) => c.dataset.label === '매출' ? ' ' + money(c.parsed.y) : ' ' + num(c.parsed.y) + '개' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
        y: { position: 'left', ticks: { callback: moneyK }, grid: { color: '#f1f1f4' } },
        y1: { position: 'right', grid: { display: false } },
      },
    },
  });
}

function renderDoughnut(id, segments, tr) {
  upsert(id, {
    type: 'doughnut',
    data: {
      labels: segments.map((s) => tr(s.label)),
      datasets: [{ data: segments.map((s) => s.revenue), backgroundColor: COLORS, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${money(c.parsed)}` } },
      },
    },
  });
}

function renderHBar(id, items) {
  upsert(id, {
    type: 'bar',
    data: {
      labels: items.map((i) => i.label),
      datasets: [{ label: '매출', data: items.map((i) => i.revenue), backgroundColor: '#6366f1', borderRadius: 4 }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ' + money(c.parsed.x) } } },
      scales: { x: { ticks: { callback: moneyK }, grid: { color: '#f1f1f4' } }, y: { grid: { display: false } } },
    },
  });
}
