// 디자인시스템 컴포넌트 카탈로그 — LLM 이 대시보드를 "매번 유연하게" 조립할 때 참고.
// 두 템플릿 지원: template1(모던·토스풍·ds-*), template2(클래식·보고서·rp-*).
// dashboard_design_system 도구가 선택된 템플릿의 가이드(+데이터 컬럼)를 반환한다.

import { TEMPLATE1_CSS } from "./tokens.js";
import { TEMPLATE2_CSS } from "./tokens2.js";

// {{BCAVE_DS}} / {{BCAVE_DS2}} 치환 시 tokens 뒤에 덧붙는 안전 보정(넘침·한글 줄바꿈·박스모델).
const SAFETY1 = `*{box-sizing:border-box}
.ds-body{word-break:keep-all;overflow-wrap:break-word}
.ds-two-col{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.ds-two-col>*{min-width:0}
@media(max-width:760px){.ds-two-col{grid-template-columns:minmax(0,1fr)}}
canvas{max-width:100%}`;

const SAFETY2 = `*{box-sizing:border-box}
.rp-body{word-break:keep-all;overflow-wrap:break-word}
.rp-grid-2{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.rp-grid-53{grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)}
.rp-grid-2>*,.rp-grid-53>*{min-width:0}
@media(max-width:820px){.rp-grid-2,.rp-grid-53{grid-template-columns:minmax(0,1fr)}}
canvas{max-width:100%}`;

// {{BCAVE_DS}} / {{BCAVE_DS2}} 가 인라인할 최종 CSS
export const TEMPLATE1_FULL_CSS = TEMPLATE1_CSS + "\n" + SAFETY1;
export const TEMPLATE2_FULL_CSS = TEMPLATE2_CSS + "\n" + SAFETY2;

const GUIDE1 = `# BCAVE 대시보드 — template1 "모던" (토스풍, ds-* 클래스)

밝은 배경·둥근 카드·파란 강조의 현대적 대시보드. 아래 규칙/컴포넌트만 사용, 임의 CSS/색 금지.
요청에 맞춰 필요한 컴포넌트만 골라 매번 다르게 구성한다. (예: "그래프만"→차트 카드만)

## 문서 뼈대 (필수)
\`\`\`html
<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>제목</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<script>{{BCAVE_CHARTJS}}</script>   <!-- 차트 쓸 때만 -->
<style>{{BCAVE_DS}}</style>          <!-- template1 CSS. 항상 -->
</head>
<body class="ds-body"><div class="ds-wrap">
  <div style="padding:16px 4px 24px"><div style="font-size:14px;font-weight:600;color:var(--gray-500)">DASHBOARD</div><h1 style="font-size:26px;font-weight:800;letter-spacing:-.03em">제목</h1></div>
  <!-- 섹션/컴포넌트 조립 -->
</div>
<script>window.__DATA={{BCAVE_DATA:/데이터파일/절대경로.xlsx#시트명}};</script>
<script>/* window.__DATA 집계해 채우기 */</script>
</body></html>
\`\`\`

## 데이터/차트 공통
- window.__DATA = 행 객체 배열(자리표시자로 자동 주입). 숫자: Number(String(v).replace(/[, ]/g,'')). 월: String(v).slice(0,7).
- 차트 팔레트: ['#3182F6','#64A8FF','#90C2FF','#C9E2FF','#FFB331','#FFD98E','#B0B8C1']. 막대/라인 #3182F6, 도넛 팔레트순.
- 차트는 높이 지정 상자: <div style="position:relative;height:280px"><canvas id="c1"></canvas></div>, options:{maintainAspectRatio:false}.

## 컴포넌트
- 섹션 제목: <div class="ds-section-title">핵심 지표</div>
- 카드: <div class="ds-card">…</div> / 헤드 <div class="ds-card-head"><div><div class="ds-card-title">제목</div><div class="ds-card-desc">설명</div></div></div>
- KPI(카드 안): <div class="ds-kpi-label">라벨</div><div class="ds-kpi-value" id="k1">–</div><div class="ds-kpi-sub">보조</div>
  · 그리드: <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">…</div>
- 델타: <span class="ds-delta ds-delta--up">▲ 3.2%</span> (하락 ds-delta--down ▼)
- 2열: <div class="ds-two-col">카드A 카드B</div>
- 차트 카드: <div class="ds-card"><div class="ds-card-head"><div><div class="ds-card-title">제목</div></div></div><div style="position:relative;height:280px"><canvas id="c1"></canvas></div></div>
- 표: <table class="ds-tbl"><thead><tr><th>열</th></tr></thead><tbody>…</tbody></table> (스크롤 <div style="overflow-x:auto">, 합계행 tr.total)
- 순위 행: <div class="ds-row"><div class="ds-row-rank">1</div><div class="ds-row-avatar">초성</div><div class="ds-row-main"><div class="ds-row-title">이름</div><div class="ds-row-sub">보조</div></div><div class="ds-row-val">값</div></div>
- 스택바+범례: <div class="ds-stackbar"><div style="width:40%;background:#3182F6"></div><div style="width:60%;background:#90C2FF"></div></div> + <div class="ds-legend"><div class="ds-legend-item"><span class="ds-legend-dot" style="background:#3182F6"></span>라벨 <span class="ds-legend-pct">40%</span></div></div>
- 목표 게이지: <div class="ds-gauge"><div style="display:flex;justify-content:space-between"><span>제목</span><span style="font-size:28px;font-weight:800">72%</span></div><div class="ds-gauge-bar"><div class="ds-gauge-fill" style="width:72%"></div></div></div>
- 팁: <div class="ds-tip">인사이트</div>
- 알림: <div class="ds-noti"><div class="ds-noti-icon" style="background:var(--blue-100)"><span style="width:8px;height:8px;border-radius:50%;background:var(--blue-500)"></span></div><div><div class="ds-noti-title">제목</div><div class="ds-noti-body">내용</div></div></div>
- 피드: <div class="ds-feed"><div class="ds-feed-item"><div class="ds-noti-title">제목</div><div class="ds-noti-time">시간</div></div></div>
- 상품 카드: <div class="ds-prod"><div class="ds-prod-img" style="background:#C9E2FF55;color:#3182F6;font-weight:800">초성</div><div class="ds-prod-body"><div class="ds-prod-cat">분류</div><div class="ds-prod-name">이름</div><div class="ds-prod-price">값</div></div></div>
- 리포트: <div class="ds-report"><p>본문 <strong>강조</strong></p><div class="ds-quote">인용</div><span class="ds-tag">태그</span></div>

## 규칙
- 요청한 섹션만. 빈 카드/영역 금지. 수정 시 요소를 감싼 카드/섹션 컨테이너 전체를 넣고 뺀다.
- 이모지 금지(초성/숫자/색점으로). 그리드 minmax(0,1fr), 캔버스 상자 높이 지정, 색은 토큰(var(--blue-500) 등).
- 완성 후 write_file 로 저장 → 자리표시자 치환 + 자동 검토. 경고 나오면 고쳐 다시 저장.`;

const GUIDE2 = `# BCAVE 대시보드 — template2 "클래식" (보고서/문서형, rp-* 클래스)

흰 종이·괘선·먹색 + 카카오옐로 강조의 문서형 실적 보고서. 번호가 매겨진 섹션으로 구성.
아래 규칙/컴포넌트만 사용, 임의 CSS/색 금지. 요청에 맞춰 필요한 섹션만 구성.

## 문서 뼈대 (필수)
\`\`\`html
<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>제목</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<script>{{BCAVE_CHARTJS}}</script>   <!-- 차트 쓸 때만 -->
<style>{{BCAVE_DS2}}</style>         <!-- template2 CSS. 항상 (주의: {{BCAVE_DS2}}) -->
</head>
<body class="rp-body"><div class="rp-page"><div class="rp-inner">
  <div class="rp-titleblock"><span class="rp-doc-type">실적 보고서</span><div class="rp-title">제목</div><div class="rp-subtitle">부제·기간</div></div>
  <!-- 번호 섹션들 -->
  <div class="rp-footer"><span>BCAVE</span><span>1 / 1</span></div>
</div></div>
<script>window.__DATA={{BCAVE_DATA:/데이터파일/절대경로.xlsx#시트명}};</script>
<script>/* window.__DATA 집계해 채우기 */</script>
</body></html>
\`\`\`

## 데이터/차트 공통
- window.__DATA = 행 객체 배열(자리표시자 자동 주입). 숫자: Number(String(v).replace(/[, ]/g,'')). 월: String(v).slice(0,7).
- 차트 팔레트(저채도 문서용): ['#2B3138','#F5C400','#9AA1A9','#DADDE1']. 기본 계열 먹색 #2B3138, 강조 옐로 #F5C400.
- 차트는 높이 지정 상자: <div style="position:relative;height:260px"><canvas id="c1"></canvas></div>, options:{maintainAspectRatio:false}. 라운드 최소(막대 borderRadius 0~2).

## 컴포넌트
- 섹션: <div class="rp-section"><div class="rp-sec-head"><span class="rp-sec-no">1</span><span class="rp-sec-title">경영 요약</span><span class="rp-sec-en">SUMMARY</span></div> …내용… </div>
  · 소제목: <div class="rp-subsec">소제목</div> · 본문: <p class="rp-text">문장 <b>강조</b></p>
- 요약 박스: <div class="rp-summary"><div class="rp-summary-label">핵심 요약</div><ul><li>항목</li><li>항목</li></ul></div>
- 시사점: <div class="rp-insight"><span class="rp-insight-label">시사점</span>문장</div>
- KPI 스트립(4칸): <div class="rp-kpi-strip"><div><div class="rp-kpi-l">라벨</div><div class="rp-kpi-v" id="k1">–<small class="pos">+3%</small></div><div class="rp-kpi-s">보조</div></div>…4개…</div> (small.pos=적/증가, small.neg=청/감소)
- 그림(차트) 프레임: <div class="rp-fig"><div class="rp-fig-head"><span class="rp-fig-title"><span class="rp-fig-no">그림1</span>제목</span><span class="rp-fig-unit">단위: 원</span></div><div class="rp-fig-body"><div style="position:relative;height:260px"><canvas id="c1"></canvas></div></div></div>
- 표: <table class="rp-tbl"><thead><tr><th>열</th></tr></thead><tbody>…</tbody></table> (합계 tr.total, 강조행 tr.hl, .up/.down/.muted, 각주 <div class="rp-tbl-note">주: …</div>)
- 100% 스택바(라벨 내장): <div class="rp-stack"><div style="width:40%;background:#2B3138;color:#fff">40%</div><div style="width:60%;background:#DADDE1">60%</div></div> + <div class="rp-stack-legend"><span><i style="background:#2B3138"></i>라벨</span></div>
- 액션/제언 표: <table class="rp-tbl rp-action-tbl"> … <td><span class="rp-prio h">높음</span></td> (rp-prio h/m/l)
- 레이아웃: <div class="rp-grid-2">A B</div> (반반) 또는 <div class="rp-grid-53">A B</div> (표+그림)

## 규칙
- 보고서답게 번호 섹션(1,2,3…)으로 구성. 요청한 섹션만. 빈 영역 금지. 수정 시 섹션/프레임 컨테이너 전체를 넣고 뺀다.
- 이모지 금지. 강조색은 옐로(--rp-accent) "문서당 소수"만. 색은 토큰(var(--rp-ink) 등) 사용.
- 그리드 minmax(0,1fr), 캔버스 상자 높이 지정.
- 완성 후 write_file 로 저장 → 자리표시자 치환 + 자동 검토. 경고 나오면 고쳐 다시 저장.`;

export interface DashTemplate {
  id: string;
  label: string; // 선택지 표시용
  guide: string;
}
export const DASH_TEMPLATES: Record<string, DashTemplate> = {
  template1: { id: "template1", label: "1. 모던 (토스풍 · 밝은 배경 · 둥근 카드 · 파란 강조)", guide: GUIDE1 },
  template2: { id: "template2", label: "2. 클래식 (문서/보고서형 · 흰 종이 · 괘선 · 먹색+옐로)", guide: GUIDE2 },
};

/** 사용자 입력(1/2, 모던/클래식, modern/classic, template1/2 등)을 템플릿 id 로 정규화. 기본 template1. */
export function normalizeTemplate(input?: string): "template1" | "template2" {
  const s = String(input ?? "").trim().toLowerCase();
  if (/(^2$|template2|클래식|classic|보고서|report|문서|document)/.test(s)) return "template2";
  return "template1";
}

// 하위호환: 기존 export 이름 유지
export const DESIGN_SYSTEM_GUIDE = GUIDE1;
export const DS_SAFETY_CSS = SAFETY1;
