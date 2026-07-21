/* BCAVE:ASSET chart v0.2 ==========================================
   BCAVE Design System — Chart Adapter (Chart.js v4 전용)
   Chart.js 번들 뒤에 로드. 차트는 반드시 BCAVE.chart.* 로만 생성한다.
   new Chart() 직접 호출은 차단되며 예외를 던진다.

   API:
     BCAVE.chart.line(el, {labels, series:[{label,data,emphasis?,compare?}]})
     BCAVE.chart.curve(el, {labels, series:[{label,data,emphasis?,compare?}]})
     BCAVE.chart.bar(el, {labels, data, highlight?})      // 단일 시리즈, 하나만 어둡게
     BCAVE.chart.donut(el, {labels, data, centerKpi?, centerSub?})
     BCAVE.chart.gauge(el, {value})                        // 0~1
     BCAVE.chart.legendHtml(el, items)                     // [{label, colorIndex, line?, dash?}]
     BCAVE.fmt.krw(n) · num(n) · pct(x) · delta(x)
   ================================================================ */
(function (global) {
  'use strict';
  if (typeof global.Chart !== 'function') {
    console.error('[BCAVE.chart] Chart.js가 먼저 로드되어야 합니다.');
    return;
  }

  var css = getComputedStyle(document.documentElement);
  var v = function (name) { return css.getPropertyValue(name).trim(); };
  var PAL = ['--chart-1','--chart-2','--chart-3','--chart-4','--chart-5','--chart-6'].map(v);
  var GRID = v('--chart-grid'), AXIS = v('--chart-axis');
  var SURFACE = v('--color-surface') || '#FFFFFF';
  var OUTLINE = v('--chart-outline');
  var FONT = v('--font-family-base') || 'Pretendard, sans-serif';
  var TOOLTIP_BG = v('--tooltip-bg') || v('--slate-800');
  var LINE_W = parseFloat(v('--line-width')) || 2;
  var LINE_W_EM = parseFloat(v('--line-width-emphasis')) || 3.5;
  var AREA_TOP = parseFloat(v('--area-opacity-top')) || 0.18;

  /* ---------- 전역 기본값: 폰트·범례·툴팁을 시스템 규격으로 ---------- */
  var C = global.Chart;
  C.defaults.font.family = FONT;
  C.defaults.font.size = 11;
  C.defaults.color = AXIS;
  C.defaults.plugins.legend.display = false;          // 범례는 HTML(.chart-legend)로
  C.defaults.plugins.tooltip.backgroundColor = TOOLTIP_BG;
  C.defaults.plugins.tooltip.titleFont = { family: FONT, weight: '700', size: 12 };
  C.defaults.plugins.tooltip.bodyFont = { family: FONT, size: 12 };
  C.defaults.plugins.tooltip.cornerRadius = 8;
  C.defaults.plugins.tooltip.padding = 10;

  /* ---------- new Chart() 직접 호출 차단 ---------- */
  var allow = false;
  function make(el, cfg) {
    var ctx = (el.getContext) ? el.getContext('2d') : el;
    allow = true;
    try { return new C(ctx, cfg); } finally { allow = false; }
  }
  var Guarded = new Proxy(C, {
    construct: function (target, args) {
      if (!allow) {
        throw new Error('[BCAVE] new Chart() 직접 호출 금지 — BCAVE.chart.line/curve/bar/donut/gauge 래퍼를 사용하세요. (RULES.md)');
      }
      return Reflect.construct(target, args);
    }
  });
  global.Chart = Guarded;

  /* ---------- 공통 스케일 ---------- */
  function baseScales(unit) {
    return {
      y: { beginAtZero: true,
           grid: { color: GRID, drawTicks: false },
           border: { display: false },
           ticks: { padding: 6, callback: function (val) { return unit === 'krw' ? BCAVE.fmt.krw(val) : BCAVE.fmt.num(val); } } },
      x: { grid: { display: false }, border: { color: GRID }, ticks: { padding: 6 } }
    };
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ---------- 선형/곡선 공통 ----------
     규격: 강조(emphasis) 시리즈만 3.5px + 마지막 점 도트 4.5,
           일반 2px + 마지막 점 3.5, 비교(compare)는 slate-300 점선.
           색은 선언 순서대로 chart-1,2,3… 자동 배정 (직접 색 지정 불가) */
  function lineLike(el, opts, smooth) {
    var series = opts.series || [];
    if (series.length > 4) console.warn('[BCAVE] 시리즈 4개 초과 — 4개 이하 권장 (모노톤 구분 한계)');
    var ci = 0;
    var datasets = series.map(function (s) {
      var compare = !!s.compare;
      var em = !!s.emphasis;
      var color = compare ? v('--slate-300') : PAL[Math.min(ci++, PAL.length - 1)];
      var last = (s.data || []).length - 1;
      return {
        label: s.label, data: s.data,
        borderColor: color,
        borderWidth: em ? LINE_W_EM : LINE_W,
        borderDash: compare ? [5, 5] : [],
        cubicInterpolationMode: smooth ? 'monotone' : 'default',
        tension: 0,
        pointRadius: function (c2) { return (c2.dataIndex === last && !compare) ? (em ? 4.5 : 3.5) : 0; },
        pointBackgroundColor: SURFACE,
        pointBorderColor: color,
        pointBorderWidth: em ? 2.6 : 2.2,
        fill: (smooth && em) ? { target: 'origin' } : false,
        backgroundColor: (smooth && em) ? function (c2) {
          var area = c2.chart.chartArea; if (!area) return hexA(color, 0);
          var g = c2.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          g.addColorStop(0, hexA(color, AREA_TOP)); g.addColorStop(1, hexA(color, 0));
          return g;
        } : undefined,
        order: em ? 0 : 1
      };
    });
    return make(el, { type: 'line',
      data: { labels: opts.labels, datasets: datasets },
      options: { responsive: true, maintainAspectRatio: false, scales: baseScales(opts.unit) } });
  }

  var api = {
    line:  function (el, opts) { return lineLike(el, opts, false); },
    curve: function (el, opts) { return lineLike(el, opts, true);  },

    /* 막대 — 단일 시리즈 전용. "하나만 어둡게": highlight 인덱스만 chart-1,
       나머지는 chart-4(라이트) + 잉크 아웃라인. 범주별 다색 순환 금지 */
    bar: function (el, opts) {
      var hl = (opts.highlight != null) ? opts.highlight : -1;
      var n = (opts.data || []).length;
      var bg = [], bd = [], bw = [];
      for (var i = 0; i < n; i++) {
        var isHl = (i === hl) || (hl === -1 && i === 0 && false);
        bg.push(i === hl ? PAL[0] : v('--chart-4'));
        bd.push(i === hl ? PAL[0] : OUTLINE);
        bw.push(i === hl ? 0 : 1);
      }
      if (hl === -1) { bg = bg.map(function(){ return PAL[0]; }); bd = bd.map(function(){ return PAL[0]; }); bw = bw.map(function(){ return 0; }); }
      return make(el, { type: (opts.horizontal ? 'bar' : 'bar'),
        data: { labels: opts.labels, datasets: [{ label: opts.label || '', data: opts.data,
          backgroundColor: bg, borderColor: bd, borderWidth: bw, borderRadius: 4,
          maxBarThickness: 36, categoryPercentage: 0.6 }] },
        options: { indexAxis: opts.horizontal ? 'y' : 'x',
          responsive: true, maintainAspectRatio: false, scales: baseScales(opts.unit) } });
    },

    /* 도넛 — 두께 26px 상당(cutout 68%), 조각 간격은 표면색 보더 2.5px,
       중앙 KPI는 캔버스 위 HTML 오버레이로 삽입. 조각 6개 초과 시 경고 */
    donut: function (el, opts) {
      var n = (opts.data || []).length;
      if (n > 6) console.warn('[BCAVE] 도넛 조각 6개 초과 — 상위 5개 + 기타로 묶기를 권장');
      var colors = opts.data.map(function (_, i) { return PAL[Math.min(i, PAL.length - 1)]; });
      var chart = make(el, { type: 'doughnut',
        data: { labels: opts.labels, datasets: [{ data: opts.data,
          backgroundColor: colors, borderColor: SURFACE, borderWidth: 2.5, hoverOffset: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%' } });
      if (opts.centerKpi) {
        var wrap = el.parentElement;
        if (wrap && getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
        var ct = document.createElement('div');
        ct.className = 'donut-center-overlay';
        ct.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;';
        ct.innerHTML = '<b class="num" style="font-size:24px;font-weight:800;color:' + v('--color-text-strong') + '">' + opts.centerKpi + '</b>' +
          (opts.centerSub ? '<span style="font-size:12px;font-weight:600;color:' + v('--color-text-tertiary') + ';margin-top:2px">' + opts.centerSub + '</span>' : '');
        wrap.appendChild(ct);
      }
      return chart;
    },

    /* 게이지 — 반원 단일 지표 (0~1) */
    gauge: function (el, opts) {
      var val = Math.max(0, Math.min(1, opts.value || 0));
      return make(el, { type: 'doughnut',
        data: { datasets: [{ data: [val, 1 - val],
          backgroundColor: [PAL[0], v('--slate-100')],
          borderWidth: 0, circumference: 180, rotation: 270 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '74%',
          plugins: { tooltip: { enabled: false } } } });
    },

    /* HTML 범례 — .chart-legend 마크업 생성 */
    legendHtml: function (el, items) {
      el.classList.add('chart-legend');
      el.innerHTML = items.map(function (it) {
        var color = it.compare ? v('--slate-300') : PAL[Math.min(it.colorIndex || 0, PAL.length - 1)];
        var mark = it.line
          ? '<span class="ln" style="background:' + color + (it.compare ? ';background:repeating-linear-gradient(90deg,' + color + ' 0 4px,transparent 4px 7px)' : '') + '"></span>'
          : '<span class="sq" style="background:' + color + '"></span>';
        return '<div class="li">' + mark + it.label + '</div>';
      }).join('');
    }
  };

  /* ---------- 숫자 포맷 — 화면의 모든 금액·수치는 이 함수로 ---------- */
  var fmt = {
    /* 통화: ₩ 기호 + 만/억 축약. 1,234 → ₩1,234 · 13531000 → ₩1,353만 · 1284036000 → ₩12.8억 */
    krw: function (n) {
      n = +n || 0;
      var sign = n < 0 ? '-' : ''; n = Math.abs(n);
      if (n >= 1e8) return sign + '₩' + (Math.round(n / 1e7) / 10).toLocaleString('ko-KR') + '억';
      if (n >= 1e4) return sign + '₩' + Math.round(n / 1e4).toLocaleString('ko-KR') + '만';
      return sign + '₩' + Math.round(n).toLocaleString('ko-KR');
    },
    num: function (n) { return (+n || 0).toLocaleString('ko-KR'); },
    pct: function (x, d) { return ((+x || 0) * 100).toFixed(d == null ? 1 : d) + '%'; },
    /* 증감: delta(0.084) → '▲ 8.4%' · delta(-0.012) → '▼ 1.2%' */
    delta: function (x, d) {
      var p = Math.abs((+x || 0) * 100).toFixed(d == null ? 1 : d) + '%';
      return ((+x || 0) >= 0 ? '▲ ' : '▼ ') + p;
    }
  };

  global.BCAVE = global.BCAVE || {};
  global.BCAVE.chart = api;
  global.BCAVE.fmt = fmt;
})(typeof window !== 'undefined' ? window : this);
