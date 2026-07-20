// 디자인시스템(template1) 컴포넌트 카탈로그 — LLM 이 대시보드를 "매번 유연하게" 조립할 때 참고.
// dashboard_design_system 도구가 이 가이드(+데이터 컬럼)를 반환한다. 컴포넌트는 tokens.ts 의 .ds-* 클래스.

// {{BCAVE_DS}} 치환 시 tokens CSS 뒤에 덧붙는 안전 보정(넘침·한글 줄바꿈·박스모델).
export const DS_SAFETY_CSS = `*{box-sizing:border-box}
.ds-body{word-break:keep-all;overflow-wrap:break-word}
.ds-two-col{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.ds-two-col>*{min-width:0}
@media(max-width:760px){.ds-two-col{grid-template-columns:minmax(0,1fr)}}
canvas{max-width:100%}`;

export const DESIGN_SYSTEM_GUIDE = `# BCAVE 대시보드 디자인시스템 (template1) — 컴포넌트 카탈로그

대시보드 HTML 을 만들 때 아래 규칙과 컴포넌트만 사용한다. 임의의 CSS 클래스/색/마크업을 새로 만들지 말 것.
요청에 맞춰 필요한 컴포넌트만 골라 매번 다르게 구성한다. (예: "그래프만"→차트 카드만, "표만"→표 카드만)

## 문서 뼈대 (필수)
\`\`\`html
<!doctype html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>제목</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<script>{{BCAVE_CHARTJS}}</script>   <!-- 차트를 쓸 때만. Chart.js 가 인라인됨 -->
<style>{{BCAVE_DS}}</style>          <!-- 디자인시스템 CSS. 항상 넣기 -->
</head>
<body class="ds-body"><div class="ds-wrap">
  <!-- 헤더 -->
  <div style="padding:16px 4px 24px"><div style="font-size:14px;font-weight:600;color:var(--gray-500)">DASHBOARD</div><h1 style="font-size:26px;font-weight:800;letter-spacing:-.03em">제목</h1></div>
  <!-- 여기에 섹션/컴포넌트를 요청에 맞게 조립 -->
</div>
<script>window.__DATA={{BCAVE_DATA:/데이터파일/절대경로.xlsx#시트명}};</script>  <!-- 데이터 자동 주입(토큰 0) -->
<script>
/* 여기서 window.__DATA(행 객체 배열)를 JS로 집계해 KPI/차트/표/랭킹을 채운다 */
</script>
</body></html>
\`\`\`

## 데이터
- \`window.__DATA\` = 행 객체 배열(각 행 = {컬럼명: 값}). 위 자리표시자로 자동 주입되니 값을 직접 쓰지 말 것.
- 숫자 파싱: \`Number(String(v).replace(/[, ]/g,''))\`. 월 추출: \`String(v).slice(0,7)\` (YYYY-MM).
- 큰 금액 표기 예: 1e8↑ "억", 1e4↑ "만".

## 차트 (Chart.js) 팔레트
\`['#3182F6','#64A8FF','#90C2FF','#C9E2FF','#FFB331','#FFD98E','#B0B8C1']\`
막대/라인 기본색 #3182F6, 도넛은 팔레트 순서. 항상 \`options:{maintainAspectRatio:false}\`, 축 그리드 색 #F2F4F6.
차트는 반드시 높이 지정된 상자 안에: \`<div style="position:relative;height:280px"><canvas id="c1"></canvas></div>\`

## 컴포넌트 (필요한 것만)
- 섹션 제목: \`<div class="ds-section-title">핵심 지표</div>\`
- 카드: \`<div class="ds-card"> … </div>\` / 헤드: \`<div class="ds-card-head"><div><div class="ds-card-title">제목</div><div class="ds-card-desc">설명</div></div></div>\`
- KPI(카드 안): \`<div class="ds-kpi-label">라벨</div><div class="ds-kpi-value" id="k1">–</div><div class="ds-kpi-sub">보조</div>\`
  · KPI 그리드: \`<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">…카드들…</div>\` (넘침 방지 위해 minmax 필수)
- 델타 배지: \`<span class="ds-delta ds-delta--up">▲ 3.2%</span>\` (하락: ds-delta--down, ▼)
- 2열: \`<div class="ds-two-col">카드A 카드B</div>\` (모바일 자동 1열)
- 차트 카드: \`<div class="ds-card"><div class="ds-card-head"><div><div class="ds-card-title">제목</div></div></div><div style="position:relative;height:280px"><canvas id="c1"></canvas></div></div>\`
- 표: \`<table class="ds-tbl"><thead><tr><th>열</th>…</tr></thead><tbody>…</tbody></table>\` (스크롤: 바깥에 \`<div style="overflow-x:auto">\`, 합계행 \`<tr class="total">\`)
- 순위 행: \`<div class="ds-row"><div class="ds-row-rank">1</div><div class="ds-row-avatar">초성</div><div class="ds-row-main"><div class="ds-row-title">이름</div><div class="ds-row-sub">보조</div></div><div class="ds-row-val">값</div></div>\` (썸네일은 ds-row-thumb)
- 스택바+범례: \`<div class="ds-stackbar"><div style="width:40%;background:#3182F6"></div><div style="width:60%;background:#90C2FF"></div></div>\` + \`<div class="ds-legend"><div class="ds-legend-item"><span class="ds-legend-dot" style="background:#3182F6"></span>라벨 <span class="ds-legend-pct">40%</span></div></div>\`
- 목표 게이지(강조): \`<div class="ds-gauge"><div style="display:flex;justify-content:space-between"><span>제목</span><span style="font-size:28px;font-weight:800">72%</span></div><div class="ds-gauge-bar"><div class="ds-gauge-fill" style="width:72%"></div></div></div>\`
- 팁 배너: \`<div class="ds-tip">인사이트 문장</div>\`
- 알림: \`<div class="ds-noti"><div class="ds-noti-icon" style="background:var(--blue-100)"><span style="width:8px;height:8px;border-radius:50%;background:var(--blue-500)"></span></div><div><div class="ds-noti-title">제목</div><div class="ds-noti-body">내용</div></div></div>\`
- 타임라인 피드: \`<div class="ds-feed"><div class="ds-feed-item"><div class="ds-noti-title">제목</div><div class="ds-noti-time">시간</div></div></div>\`
- 상품 카드: \`<div class="ds-prod"><div class="ds-prod-img" style="background:#C9E2FF55;color:#3182F6;font-weight:800">초성</div><div class="ds-prod-body"><div class="ds-prod-cat">분류</div><div class="ds-prod-name">이름</div><div class="ds-prod-price">값</div></div></div>\` (그리드: repeat(3,minmax(0,1fr)))
- 리포트: \`<div class="ds-report"><p>본문 <strong>강조</strong></p><div class="ds-quote">인용</div><span class="ds-tag">태그</span></div>\`

## 규칙 (반드시)
- 요청에 맞는 섹션만 만든다. 빈 카드/빈 영역/의미 없는 자리를 남기지 말 것.
- 기존 대시보드 수정 시: 요청한 요소를 감싼 **컨테이너(카드/섹션) 전체**를 제거·추가한다(내용만 지워 빈 상자 남기지 말 것).
- 이모지 금지. 아이콘 자리는 초성/숫자/색 점으로.
- 그리드는 minmax(0,1fr), 캔버스는 상자 높이 지정. 임의 색 대신 토큰(var(--blue-500) 등) 사용.
- 완성하면 write_file 로 저장 → 자리표시자 치환 + 자동 검토가 실행된다. 검토 경고가 나오면 고쳐 다시 저장.`;
