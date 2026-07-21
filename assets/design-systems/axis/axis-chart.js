/* AXIS:ASSET chart v0.1 ===========================================
   AXIS Design System — Chart Adapter (Chart.js v4 전용)
   Chart.js 번들 뒤에 로드. 차트는 반드시 BCAVE... 아니 AXIS.chart.* 로만 생성한다.
   new Chart() 직접 호출은 차단되며 예외를 던진다.

   BCAVE와의 차이: AXIS의 8색 팔레트(--chart-1~8)는 "인접 구분성 우선"
   설계이므로 카테고리마다 다른 hue를 그대로 쓴다 (모노톤 강제 없음).
   강조는 색이 아니라 굵기 + 마지막 점 도트로 표시한다.

   API:
     AXIS.chart.line(el, {labels, series:[{label,data,emphasis?,compare?}]})
     AXIS.chart.curve(el, {labels, series:[{label,data,emphasis?,compare?}]})
     AXIS.chart.bar(el, {labels, data, unit?})             // 카테고리별 자동 다색
     AXIS.chart.donut(el, {labels, data, centerKpi?, centerSub?})
     AXIS.chart.gauge(el, {value})                          // 0~1
     AXIS.chart.legendHtml(el, items)                       // [{label, colorIndex, line?, dash?}]
     AXIS.fmt.krw(n) · num(n) · pct(x) · delta(x)
   ================================================================ */
(function (global) {
  'use strict';
  if (typeof global.Chart !== 'function') {
    console.error('[AXIS.chart] Chart.js가 먼저 로드되어야 합니다.');
    return;
  }

  var css = getComputedStyle(document.documentElement);
  var v = function (name) { return css.getPropertyValue(name).trim(); };
  var PAL = ['--chart-1','--chart-2','--chart-3','--chart-4','--chart-5','--chart-6','--chart-7','--chart-8'].map(v);
  var GRID = v('--chart-grid'), AXISC = v('--chart-axis');
  var SURFACE = v('--color-surface') || '#FFFFFF';
  var FONT = v('--font-family-base') || 'Pretendard, sans-serif';
  var TOOLTIP_BG = v('--gray-900') || '#1A1F29';
  var LINE_W = parseFloat(v('--line-width')) || 2;
  var LINE_W_EM = parseFloat(v('--line-width-emphasis')) || 3;
  var AREA_TOP = parseFloat(v('--area-opacity-top')) || 0.16;

  /* ---------- 전역 기본값 ---------- */
  var C = global.Chart;
  C.defaults.font.family = FONT;
  C.defaults.font.size = 11;
  C.defaults.color = AXISC;
  C.defaults.plugins.legend.display = false;          // 범례는 HTML(.chart-legend)로
  C.defaults.plugins.tooltip.backgroundColor = TOOLTIP_BG;
  C.defaults.plugins.tooltip.titleFont = { family: FONT, weight: '600', size: 12 };
  C.defaults.plugins.tooltip.bodyFont = { family: FONT, size: 12 };
  C.defaults.plugins.tooltip.cornerRadius = 6;
  C.defaults.plugins.tooltip.padding = 9;

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
        throw new Error('[AXIS] new Chart() 직접 호출 금지 — AXIS.chart.line/curve/bar/donut/gauge 래퍼를 사용하세요. (RULES.md)');
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
           ticks: { padding: 6, callback: function (val) { return unit === 'krw' ? AXIS.fmt.krw(val) : AXIS.fmt.num(val); } } },
      x: { grid: { display: false }, border: { color: GRID }, ticks: { padding: 6 } }
    };
  }
  function hexA(hex, a) {
    var n = parseInt(hex.replace('#',''), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ---------- 선형/곡선 공통 ----------
     규격: 강조(emphasis) 시리즈만 굵게(line-width-emphasis) + 마지막 점 도트 확대,
     일반은 line-width + 작은 도트, 비교(compare)는 회색 점선.
     색은 선언 순서대로 chart-1,2,3… 자동 배정 */
  function lineLike(el, opts, smooth) {
    var series = opts.series || [];
    if (series.length > 8) console.warn('[AXIS] 시리즈 8개 초과 — 팔레트 재사용 발생');
    var ci = 0;
    var datasets = series.map(function (s) {
      var compare = !!s.compare;
      var em = !!s.emphasis;
      var color = compare ? v('--gray-300') : PAL[ci++ % PAL.length];
      var last = (s.data || []).length - 1;
      return {
        label: s.label, data: s.data,
        borderColor: color,
        borderWidth: em ? LINE_W_EM : LINE_W,
        borderDash: compare ? [5, 4] : [],
        cubicInterpolationMode: smooth ? 'monotone' : 'default',
        tension: 0,
        pointRadius: function (c2) { return (c2.dataIndex === last && !compare) ? (em ? 4.5 : 3) : 0; },
        pointBackgroundColor: SURFACE,
        pointBorderColor: color,
        pointBorderWidth: em ? 2.4 : 2,
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

    /* 막대 — 카테고리별 팔레트 자동 순환 (AXIS는 다색 구분이 설계 의도) */
    bar: function (el, opts) {
      var n = (opts.data || []).length;
      if (n > 8) console.warn('[AXIS] 막대 카테고리 8개 초과 — 팔레트 재사용, 상위 N + 기타 권장');
      var bg = opts.data.map(function (_, i) { return PAL[i % PAL.length]; });
      return make(el, { type: 'bar',
        data: { labels: opts.labels, datasets: [{ label: opts.label || '', data: opts.data,
          backgroundColor: bg, borderRadius: 5, maxBarThickness: 34, categoryPercentage: 0.62 }] },
        options: { indexAxis: opts.horizontal ? 'y' : 'x',
          responsive: true, maintainAspectRatio: false, scales: baseScales(opts.unit) } });
    },

    /* 도넛 — 두께 22px 상당(cutout), 표면색 보더로 조각 분리, 중앙 KPI는 HTML 오버레이 */
    donut: function (el, opts) {
      var n = (opts.data || []).length;
      if (n > 8) console.warn('[AXIS] 도넛 조각 8개 초과 — 상위 7 + 기타로 묶기를 권장');
      var colors = opts.data.map(function (_, i) { return PAL[i % PAL.length]; });
      var chart = make(el, { type: 'doughnut',
        data: { labels: opts.labels, datasets: [{ data: opts.data,
          backgroundColor: colors, borderColor: SURFACE, borderWidth: 2, hoverOffset: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '66%' } });
      if (opts.centerKpi) {
        var wrap = el.parentElement;
        if (wrap && getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
        var ct = document.createElement('div');
        ct.className = 'donut-center-overlay';
        ct.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;';
        ct.innerHTML = '<b class="num" style="font-size:23px;font-weight:700;color:' + v('--color-text-primary') + '">' + opts.centerKpi + '</b>' +
          (opts.centerSub ? '<span style="font-size:12px;font-weight:500;color:' + v('--color-text-tertiary') + ';margin-top:2px">' + opts.centerSub + '</span>' : '');
        wrap.appendChild(ct);
      }
      return chart;
    },

    /* 게이지 — 반원 단일 지표 (0~1), 색은 primary 고정 */
    gauge: function (el, opts) {
      var val = Math.max(0, Math.min(1, opts.value || 0));
      return make(el, { type: 'doughnut',
        data: { datasets: [{ data: [val, 1 - val],
          backgroundColor: [PAL[0], v('--gray-100')],
          borderWidth: 0, circumference: 180, rotation: 270 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '72%',
          plugins: { tooltip: { enabled: false } } } });
    },

    legendHtml: function (el, items) {
      el.classList.add('chart-legend');
      el.innerHTML = items.map(function (it) {
        var color = it.compare ? v('--gray-300') : PAL[(it.colorIndex || 0) % PAL.length];
        var mark = it.line
          ? '<span class="ln" style="background:' + color + (it.compare ? ';background:repeating-linear-gradient(90deg,' + color + ' 0 4px,transparent 4px 7px)' : '') + '"></span>'
          : '<span class="sq" style="background:' + color + '"></span>';
        return '<div class="li">' + mark + it.label + '</div>';
      }).join('');
    }
  };

  var fmt = {
    krw: function (n) {
      n = +n || 0;
      var sign = n < 0 ? '-' : ''; n = Math.abs(n);
      if (n >= 1e8) return sign + '₩' + (Math.round(n / 1e7) / 10).toLocaleString('ko-KR') + '억';
      if (n >= 1e4) return sign + '₩' + Math.round(n / 1e4).toLocaleString('ko-KR') + '만';
      return sign + '₩' + Math.round(n).toLocaleString('ko-KR');
    },
    num: function (n) { return (+n || 0).toLocaleString('ko-KR'); },
    pct: function (x, d) { return ((+x || 0) * 100).toFixed(d == null ? 1 : d) + '%'; },
    delta: function (x, d) {
      var p = Math.abs((+x || 0) * 100).toFixed(d == null ? 1 : d) + '%';
      return ((+x || 0) >= 0 ? '▲ ' : '▼ ') + p;
    }
  };

  /* 밀도 전환 헬퍼 — <html data-density> 토글 */
  function setDensity(mode) {
    document.documentElement.setAttribute('data-density', mode === 'compact' ? 'compact' : '');
  }

  global.AXIS = global.AXIS || {};
  global.AXIS.chart = api;
  global.AXIS.fmt = fmt;
  global.AXIS.setDensity = setDensity;
})(typeof window !== 'undefined' ? window : this);
