// template2 디자인시스템 토큰·컴포넌트 CSS (원본: 사용자 제공 dashboard-tokens2.css).
// 클래식/보고서 스타일 (rp- 접두사, 먹색+카카오옐로, 문서형).
export const TEMPLATE2_CSS = `/* ============================================================
   실적 보고서 디자인 시스템 v1.0 — 토큰 & 컴포넌트
   문서형 대시보드(보고서) 전용 · Pretendard 필요
   접두사: rp- (report)
   ============================================================ */

/* ── 1. 토큰 ─────────────────────────────────── */
:root{
  /* Color / Ink (먹색 계층) */
  --rp-ink:#1F2328;          /* 제목·핵심 숫자·괘선(강) */
  --rp-ink-2:#4B5259;        /* 본문 */
  --rp-ink-3:#8A9199;        /* 캡션·표 헤더·비고 */

  /* Color / Accent — 카카오 옐로 (인쇄 시인성용 진한 톤) */
  --rp-accent:#F5C400;       /* 섹션 번호·강조 막대·강조점. 문서당 "한 곳에 하나"만 */
  --rp-accent-light:#FFF6D5; /* 요약 박스·강조 행 배경 */
  --rp-accent-line:#EBD98A;  /* 요약 박스 테두리 */

  /* Color / Line & Surface */
  --rp-line:#E3E6EA;         /* 기본 괘선 */
  --rp-line-strong:#C9CED4;  /* 헤더 하단·축선 */
  --rp-bg:#F4F5F7;           /* 화면 배경 (인쇄 시 백색) */
  --rp-paper:#FFFFFF;
  --rp-surface:#F7F8F9;      /* 표 헤더·합계 행·시사점 박스 */

  /* Color / Semantic — 보고서용 저채도 */
  --rp-up:#C4302B;           /* 증가 (차분한 적) */
  --rp-down:#1D5FBF;         /* 감소 (차분한 청) */

  /* Color / Chart */
  --rp-chart-1:#2B3138;      /* 기본 계열 = 먹색 */
  --rp-chart-2:#F5C400;      /* 강조 계열 = 옐로 */
  --rp-chart-3:#9AA1A9;      /* 보조 */
  --rp-chart-4:#DADDE1;      /* 비강조 */

  /* Typography */
  --rp-font:"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  --rp-text-title:30px;      /* 문서 제목 800 */
  --rp-text-h2:18px;         /* 섹션 제목 800 */
  --rp-text-h3:14px;         /* 소제목 800 */
  --rp-text-kpi:21px;        /* KPI 숫자 800 */
  --rp-text-body:13.5px;     /* 본문 500, lh 1.8 */
  --rp-text-tbl:12.5px;      /* 표 본문 */
  --rp-text-cap:11px;        /* 캡션·비고 */

  /* Layout */
  --rp-page-max:1000px;
  --rp-page-pad:52px;        /* 종이 안쪽 여백 (모바일 22px) */
  --rp-radius:0px;           /* 문서형 = 라운드 없음. 필요 시 4px 한도 */
}

/* ── 2. 페이지(종이) ─────────────────────────── */
.rp-body{font-family:var(--rp-font);background:var(--rp-bg);color:var(--rp-ink);
  -webkit-font-smoothing:antialiased;letter-spacing:-0.01em;font-size:14px}
.rp-page{max-width:var(--rp-page-max);margin:28px auto 60px;background:var(--rp-paper);
  border:1px solid var(--rp-line);box-shadow:0 2px 14px rgba(20,25,30,.06)}
.rp-inner{padding:48px var(--rp-page-pad)}

/* ── 3. 문서 표제부 ──────────────────────────── */
.rp-meta{display:flex;justify-content:space-between;padding-bottom:14px;
  border-bottom:1px solid var(--rp-line);font-size:12px;color:var(--rp-ink-3)}
.rp-confidential{font-weight:700;color:var(--rp-ink-2);
  border:1px solid var(--rp-line-strong);padding:3px 10px;letter-spacing:.06em}
.rp-titleblock{padding:34px 0 26px;border-bottom:3px solid var(--rp-ink)}
.rp-doc-type{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.08em;
  color:var(--rp-ink);background:var(--rp-accent);padding:4px 12px;margin-bottom:16px}
.rp-title{font-size:var(--rp-text-title);font-weight:800;letter-spacing:-0.02em;line-height:1.3}
.rp-subtitle{font-size:15px;color:var(--rp-ink-2);margin-top:8px;font-weight:500}
.rp-doc-info{display:flex;flex-wrap:wrap;border-bottom:1px solid var(--rp-line);font-size:12.5px}
.rp-doc-info div{padding:11px 22px 11px 0;margin-right:22px}
.rp-doc-info dt{color:var(--rp-ink-3);font-weight:600;font-size:11px;margin-bottom:3px}
.rp-doc-info dd{font-weight:600}

/* ── 4. 섹션 ─────────────────────────────────── */
.rp-section{margin-top:44px}
.rp-sec-head{display:flex;align-items:baseline;gap:12px;padding-bottom:10px;
  border-bottom:2px solid var(--rp-ink);margin-bottom:20px}
.rp-sec-no{font-size:15px;font-weight:800;background:var(--rp-accent);padding:1px 8px}
.rp-sec-title{font-size:var(--rp-text-h2);font-weight:800}
.rp-sec-en{margin-left:auto;font-size:11px;color:var(--rp-ink-3);font-weight:600;letter-spacing:.05em}
.rp-subsec{font-size:var(--rp-text-h3);font-weight:800;margin:26px 0 12px;
  padding-left:10px;border-left:3px solid var(--rp-accent)}
.rp-text{font-size:var(--rp-text-body);line-height:1.8;color:var(--rp-ink-2);margin-bottom:12px}
.rp-text b{color:var(--rp-ink);font-weight:700}

/* ── 5. 요약 · 시사점 박스 ───────────────────── */
.rp-summary{background:var(--rp-accent-light);border:1px solid var(--rp-accent-line);
  padding:18px 22px;margin-bottom:22px}
.rp-summary-label{font-size:12px;font-weight:800;letter-spacing:.06em;margin-bottom:9px}
.rp-summary ul{list-style:none}
.rp-summary li{font-size:13.5px;line-height:1.75;font-weight:500;padding-left:14px;position:relative}
.rp-summary li::before{content:"■";position:absolute;left:0;font-size:8px;line-height:2.9}
.rp-insight{background:var(--rp-surface);border-left:3px solid var(--rp-ink);
  padding:13px 18px;margin-top:16px;font-size:13px;line-height:1.7;color:var(--rp-ink-2)}
.rp-insight-label{font-weight:800;color:var(--rp-ink);margin-right:8px}

/* ── 6. KPI 격자 ─────────────────────────────── */
.rp-kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);
  border:1px solid var(--rp-line);border-bottom:none}
.rp-kpi-strip > div{padding:16px 18px;border-bottom:1px solid var(--rp-line);
  border-right:1px solid var(--rp-line)}
.rp-kpi-strip > div:nth-child(4n){border-right:none}
.rp-kpi-l{font-size:11.5px;font-weight:600;color:var(--rp-ink-3)}
.rp-kpi-v{font-size:var(--rp-text-kpi);font-weight:800;margin-top:6px;
  font-variant-numeric:tabular-nums;letter-spacing:-0.02em}
.rp-kpi-v small{font-size:12px;font-weight:700;margin-left:6px}
.rp-kpi-v small.pos{color:var(--rp-up)}
.rp-kpi-v small.neg{color:var(--rp-down)}
.rp-kpi-s{font-size:11px;color:var(--rp-ink-3);margin-top:4px}

/* ── 7. 표 ───────────────────────────────────── */
.rp-tbl{width:100%;border-collapse:collapse;font-size:var(--rp-text-tbl);
  border-top:2px solid var(--rp-ink)}
.rp-tbl thead th{background:var(--rp-surface);font-size:11.5px;font-weight:700;
  color:var(--rp-ink-2);text-align:right;padding:9px 10px;
  border-bottom:1px solid var(--rp-line-strong);white-space:nowrap}
.rp-tbl thead th:first-child{text-align:left}
.rp-tbl td{padding:10px;text-align:right;border-bottom:1px solid var(--rp-line);
  font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap}
.rp-tbl td:first-child{text-align:left;font-weight:700}
.rp-tbl .up{color:var(--rp-up);font-weight:700}
.rp-tbl .down{color:var(--rp-down);font-weight:700}
.rp-tbl .muted{color:var(--rp-ink-3);font-weight:400}
.rp-tbl tr.total td{background:var(--rp-surface);font-weight:800;
  border-top:1px solid var(--rp-line-strong)}
.rp-tbl tr.hl td{background:var(--rp-accent-light)}   /* 강조 행 — 표당 1행 */
.rp-tbl-note{font-size:var(--rp-text-cap);color:var(--rp-ink-3);margin-top:7px}
.rp-bdot{display:inline-block;width:9px;height:9px;margin-right:8px}

/* ── 8. 그림(차트) 프레임 ────────────────────── */
.rp-fig{border:1px solid var(--rp-line)}
.rp-fig-head{display:flex;justify-content:space-between;align-items:center;
  padding:11px 16px;border-bottom:1px solid var(--rp-line);background:#FBFBFC}
.rp-fig-title{font-size:12.5px;font-weight:800}
.rp-fig-no{color:var(--rp-ink-3);font-weight:700;margin-right:8px}
.rp-fig-unit{font-size:11px;color:var(--rp-ink-3);font-weight:500}
.rp-fig-body{padding:16px}

/* ── 9. 100% 스택바 (라벨 내장형) ────────────── */
.rp-stack{display:flex;height:22px;border:1px solid var(--rp-line);margin-bottom:10px}
.rp-stack div{height:100%;display:flex;align-items:center;justify-content:center;
  font-size:10.5px;font-weight:800;overflow:hidden;white-space:nowrap}
.rp-stack-legend{display:flex;flex-wrap:wrap;gap:8px 18px;
  font-size:11.5px;font-weight:600;color:var(--rp-ink-2)}
.rp-stack-legend span{display:flex;align-items:center;gap:6px}
.rp-stack-legend i{width:10px;height:10px;font-style:normal}

/* ── 10. 액션 테이블 · 우선순위 배지 ─────────── */
.rp-action-tbl td{text-align:left;white-space:normal;line-height:1.55}
.rp-prio{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 8px;border:1px solid}
.rp-prio.h{color:var(--rp-up);border-color:var(--rp-up)}
.rp-prio.m{color:var(--rp-ink-2);border-color:var(--rp-line-strong)}
.rp-prio.l{color:var(--rp-ink-3);border-color:var(--rp-line)}

/* ── 11. 레이아웃 그리드 ─────────────────────── */
.rp-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.rp-grid-53{display:grid;grid-template-columns:1fr 1.15fr;gap:18px;align-items:start}

/* ── 12. 푸터 ────────────────────────────────── */
.rp-footer{margin-top:48px;padding-top:14px;border-top:1px solid var(--rp-line);
  display:flex;justify-content:space-between;font-size:11px;color:var(--rp-ink-3)}

/* ── 13. 반응형 · 인쇄 ───────────────────────── */
@media (max-width:820px){
  .rp-inner{padding:32px 22px}
  .rp-kpi-strip{grid-template-columns:1fr 1fr}
  .rp-kpi-strip > div:nth-child(2n){border-right:none}
  .rp-grid-2,.rp-grid-53{grid-template-columns:1fr}
  .rp-title{font-size:24px}
}
@media print{
  .rp-body{background:#fff}
  .rp-page{border:none;box-shadow:none;margin:0;max-width:100%}
  .rp-section{break-inside:avoid-page}
  .rp-fig,.rp-tbl,.rp-summary{break-inside:avoid}
}
`;
