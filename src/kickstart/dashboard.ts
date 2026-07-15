// 결정론적 대시보드 엔진.
// 스프레드시트를 코드로 프로파일링(컬럼 유형 자동 판별) → 스펙 생성 → 검증된 템플릿으로 HTML 조립.
// LLM 은 HTML 을 한 줄도 쓰지 않는다(토큰 0, 매번 일정한 품질). 원본 디자인시스템 CSS 는 자리표시자로 주입.

import { DS_WRAP } from "./ds-styles.js";

export type ColKind = "date" | "numeric" | "binary" | "categorical" | "text";

export interface ColProfile {
  name: string;
  kind: ColKind;
  filled: number; // 비어있지 않은 값 수
  cardinality: number; // 고유값 수(샘플 기준)
  positive?: string; // binary 의 "긍정" 값 (비율 KPI 용)
  magnitude?: number; // numeric 평균 크기 (핵심 지표 선택용)
}

export interface Kpi {
  label: string;
  kind: "count" | "avg" | "max" | "rate";
  col?: string;
  positive?: string;
}
export interface ChartSpec {
  title: string;
  kind: "bar" | "doughnut" | "line";
  col: string;
}
export interface DashboardSpec {
  title: string;
  kpis: Kpi[];
  charts: ChartSpec[];
  tableCols: string[];
  numericCols: string[];
}

const YESNO = new Set(["y", "n", "예", "아니오", "아니요", "true", "false", "o", "x", "1", "0", "yes", "no"]);
const POSITIVE = ["y", "예", "yes", "true", "o", "1"];

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[, %₩$]/g, "").trim());
  return isNaN(n) ? null : n;
}
function isDateVal(v: unknown): boolean {
  if (v instanceof Date) return true;
  const s = String(v).trim();
  return /^\d{4}[-/.]\d{1,2}([-/.]\d{1,2})?/.test(s);
}

/** 컬럼별 유형을 판별. */
export function profileColumns(rows: Record<string, unknown>[]): ColProfile[] {
  const cols = Object.keys(rows[0] ?? {});
  const sample = rows.slice(0, 800);
  return cols.map((name) => {
    const vals = sample.map((r) => r[name]).filter((v) => v != null && v !== "");
    const filled = vals.length || 1;
    const distinct = new Set(vals.map((v) => String(v)));
    const cardinality = distinct.size;
    const numCount = vals.filter((v) => toNum(v) != null).length;
    const dateCount = vals.filter(isDateVal).length;
    const lowered = [...distinct].map((s) => s.toLowerCase());

    let kind: ColKind = "text";
    let positive: string | undefined;
    let magnitude: number | undefined;

    if (dateCount / filled >= 0.7) {
      kind = "date";
    } else if (cardinality <= 3 && lowered.every((s) => YESNO.has(s))) {
      kind = "binary";
      positive = [...distinct].find((s) => POSITIVE.includes(s.toLowerCase())) ?? [...distinct][0];
    } else if (numCount / filled >= 0.8) {
      kind = "numeric";
      const nums = vals.map(toNum).filter((n): n is number => n != null);
      magnitude = nums.reduce((a, b) => a + Math.abs(b), 0) / Math.max(nums.length, 1);
    } else if (cardinality >= 2 && cardinality <= 25 && cardinality / filled < 0.6) {
      kind = "categorical";
    } else {
      kind = "text";
    }
    return { name, kind, filled, cardinality, positive, magnitude };
  });
}

/** 프로파일 → 대시보드 스펙(자동 매핑). */
export function buildSpec(cols: ColProfile[], title: string): DashboardSpec {
  const numerics = cols.filter((c) => c.kind === "numeric").sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0));
  const binaries = cols.filter((c) => c.kind === "binary");
  const cats = cols.filter((c) => c.kind === "categorical").sort((a, b) => a.cardinality - b.cardinality);
  const dates = cols.filter((c) => c.kind === "date");

  const kpis: Kpi[] = [{ label: "전체", kind: "count" }];
  if (numerics[0]) {
    kpis.push({ label: `평균 ${numerics[0].name}`, kind: "avg", col: numerics[0].name });
    kpis.push({ label: `최고 ${numerics[0].name}`, kind: "max", col: numerics[0].name });
  }
  if (binaries[0]) kpis.push({ label: `${binaries[0].name} 비율`, kind: "rate", col: binaries[0].name, positive: binaries[0].positive });
  if (kpis.length < 4 && numerics[1]) kpis.push({ label: `평균 ${numerics[1].name}`, kind: "avg", col: numerics[1].name });

  const charts: ChartSpec[] = [];
  cats.slice(0, 3).forEach((c, i) => charts.push({ title: `${c.name} 분포`, kind: i === 2 ? "doughnut" : "bar", col: c.name }));
  if (dates[0]) charts.push({ title: `${dates[0].name} 월별 추이`, kind: "line", col: dates[0].name });
  // 카테고리가 부족하면 이진 컬럼을 도넛으로 보충
  if (charts.length < 2 && binaries[0]) charts.push({ title: `${binaries[0].name} 분포`, kind: "doughnut", col: binaries[0].name });

  return {
    title,
    kpis: kpis.slice(0, 4),
    charts: charts.slice(0, 4),
    tableCols: cols.map((c) => c.name),
    numericCols: numerics.map((c) => c.name),
  };
}

// 데이터·스펙만 읽어 KPI/차트/표를 그리는 범용 렌더 스크립트(라이브러리 로직 없이 순수 JS).
const RENDER_SCRIPT = `<script>(function(){
var esc=window.esc||function(v){return String(v==null?'':v);};
var SPEC=window.__SPEC||{},DATA=window.__DATA||[];
function num(v){var n=Number(String(v==null?'':v).replace(/[, %]/g,''));return isNaN(n)?0:n;}
function fmt(n){return Number(n).toLocaleString('ko-KR');}
var total=DATA.length;
function set(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
(SPEC.kpis||[]).forEach(function(k,i){var v='';
if(k.kind==='count')v=fmt(total)+'건';
else if(k.kind==='avg'){var s=0,c=0;DATA.forEach(function(r){if(r[k.col]!=null&&r[k.col]!==''){s+=num(r[k.col]);c++;}});v=fmt(Math.round(s/Math.max(c,1)));}
else if(k.kind==='max'){var m=0;DATA.forEach(function(r){m=Math.max(m,num(r[k.col]));});v=fmt(m);}
else if(k.kind==='rate'){var y=DATA.filter(function(r){return String(r[k.col]).trim()===k.positive;}).length;v=(Math.round(y/Math.max(total,1)*1000)/10)+'%';}
set('kpi'+i,v);});
function cnt(col){var m={};DATA.forEach(function(r){var x=r[col];x=(x==null||x==='')?'미상':String(x);m[x]=(m[x]||0)+1;});return m;}
function monthly(col){var m={};DATA.forEach(function(r){var d=String(r[col]||'').slice(0,7);if(/^\\d{4}[-/.]\\d{2}$/.test(d))m[d.replace(/[/.]/g,'-')]=(m[d]||0)+1;});var ks=Object.keys(m).sort();var o={};ks.forEach(function(k){o[k]=m[k];});return o;}
function top(o,n){return Object.keys(o).map(function(k){return [k,o[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,n).reduce(function(p,c){p[c[0]]=c[1];return p;},{});}
var rgb=(function(){var h=(getComputedStyle(document.documentElement).getPropertyValue('--ds-accent')||'#3182f6').trim().replace('#','');if(h.length===3)h=h.split('').map(function(x){return x+x;}).join('');var n=parseInt(h,16);return (h.length===6&&!isNaN(n))?[(n>>16)&255,(n>>8)&255,n&255]:[49,130,246];})();
var acc='rgb('+rgb.join(',')+')';
function sh(t){return 'rgb('+rgb.map(function(x){return Math.round(x+(255-x)*t);}).join(',')+')';}
var scale=[acc,sh(.28),sh(.46),sh(.62),sh(.76),sh(.86),sh(.92)];
try{if(window.Chart){Chart.defaults.maintainAspectRatio=false;
(SPEC.charts||[]).forEach(function(ch,i){var el=document.getElementById('chart'+i);if(!el)return;
var data=ch.kind==='line'?monthly(ch.col):top(cnt(ch.col),8);
var labels=Object.keys(data),vals=labels.map(function(k){return data[k];});
if(ch.kind==='doughnut'){new Chart(el,{type:'doughnut',data:{labels:labels,datasets:[{data:vals,backgroundColor:scale,borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,cutout:'62%',plugins:{legend:{position:'bottom'}}}});}
else if(ch.kind==='line'){new Chart(el,{type:'line',data:{labels:labels,datasets:[{data:vals,borderColor:acc,backgroundColor:'rgba('+rgb.join(',')+',.12)',fill:true,tension:.35,pointRadius:0,borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{beginAtZero:true}}}});}
else{new Chart(el,{type:'bar',data:{labels:labels,datasets:[{data:vals,backgroundColor:acc,borderRadius:6,maxBarThickness:52}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true}}}});}
});}}catch(e){}
var cols=SPEC.tableCols||Object.keys(DATA[0]||{}),nums=SPEC.numericCols||[];
var th=document.getElementById('thead');if(th)th.innerHTML='<tr>'+cols.map(function(c){return '<th'+(nums.indexOf(c)>=0?' class=\\"num\\"':'')+'>'+esc(c)+'</th>';}).join('')+'</tr>';
var P=1,S=15,F=DATA,tb=document.getElementById('tb'),q=document.getElementById('q'),cn=document.getElementById('cnt'),pv=document.getElementById('pv'),nx=document.getElementById('nx'),pi=document.getElementById('pi');
function draw(){if(!tb)return;var pg=Math.max(1,Math.ceil(F.length/S));if(P>pg)P=pg;var sl=F.slice((P-1)*S,(P-1)*S+S);
tb.innerHTML=sl.length?sl.map(function(r){return '<tr>'+cols.map(function(c){return '<td'+(nums.indexOf(c)>=0?' class=\\"num\\"':'')+'>'+esc(r[c])+'</td>';}).join('')+'</tr>';}).join(''):'<tr><td colspan="'+cols.length+'" style="padding:24px;text-align:center;color:var(--ds-text-2,#888)">검색 결과가 없습니다.</td></tr>';
if(cn)cn.textContent='전체 '+fmt(F.length)+'건';if(pi)pi.textContent=P+' / '+pg;if(pv)pv.disabled=P<=1;if(nx)nx.disabled=P>=pg;}
if(q)q.addEventListener('input',function(){var s=q.value.trim().toLowerCase();F=!s?DATA:DATA.filter(function(r){return cols.some(function(c){return String(r[c]).toLowerCase().indexOf(s)>=0;});});P=1;draw();});
if(pv)pv.onclick=function(){if(P>1){P--;draw();}};if(nx)nx.onclick=function(){P++;draw();};draw();
})();</script>`;

function heading(headTpl: string, eyebrow: string, title: string): string {
  if (headTpl.includes("section-eyebrow"))
    return `<p class="section-eyebrow">${eyebrow}</p><h2 class="section-title">${title}</h2>`;
  if (headTpl.includes("section-title")) return `<h2 class="section-title">${title}</h2>`;
  return `<h2>${title}</h2>`;
}

/** 스펙 + 디자인시스템 → 단일 HTML(자리표시자 포함). write_file 로 저장하면 CSS/데이터가 주입되고 검토된다.
 *  sheet 를 넘기면 데이터 주입 시트를 프로파일링한 시트와 일치시킨다(다중 시트 엑셀 필수). */
export function renderDashboard(designSystem: string, dataFile: string, spec: DashboardSpec, sheet?: string): string {
  const id = DS_WRAP[designSystem] ? designSystem : "apple";
  const w = DS_WRAP[id];

  const kpiCard = (i: number, label: string) =>
    `<div class="card" style="padding:20px 22px"><div style="font-size:13px;color:var(--ds-text-2,#888)">${label}</div><div id="kpi${i}" style="font-size:30px;font-weight:700;letter-spacing:-.02em;margin-top:8px">–</div></div>`;
  const chartCard = (i: number, title: string) =>
    `<div class="card" style="padding:20px 22px"><h3 style="margin:0 0 12px;font-size:15px;font-weight:600">${title}</h3><div style="position:relative;height:280px"><canvas id="chart${i}"></canvas></div></div>`;

  const kpis =
    `<div class="${w.grid}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">` +
    spec.kpis.map((k, i) => kpiCard(i, k.label)).join("") +
    `</div>`;
  const charts =
    `<div class="${w.grid}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">` +
    spec.charts.map((c, i) => chartCard(i, c.title)).join("") +
    `</div>`;
  const table =
    `<div class="card" style="padding:14px 16px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">` +
    `<input id="q" type="search" placeholder="검색" style="padding:9px 13px;border:1px solid var(--ds-border,#ddd);border-radius:10px;font:inherit;background:var(--ds-surface,#fff);color:var(--ds-text,#111)">` +
    `<span id="cnt" style="font-size:13px;color:var(--ds-text-2,#888)"></span></div>` +
    `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead id="thead"></thead><tbody id="tb"></tbody></table></div>` +
    `<div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;margin-top:12px"><span id="pi" style="margin-right:auto;font-size:13px;color:var(--ds-text-2,#888)"></span>` +
    `<button class="btn btn-secondary" id="pv">이전</button><button class="btn btn-secondary" id="nx">다음</button></div></div>`;

  const sec = (sid: string, eyebrow: string, title: string, inner: string) =>
    `<section id="${sid}"${w.section ? ` class="${w.section}"` : ""} style="margin-top:36px">${heading(w.head, eyebrow, title)}${inner}</section>`;
  const content =
    sec("overview", "OVERVIEW", `${spec.title} · 현황`, kpis) +
    (spec.charts.length ? sec("charts", "ANALYTICS", "분포 분석", charts) : "") +
    sec("table", "TABLE", "전체 목록", table);

  const inO = w.inner ? `<div class="${w.inner}">` : "";
  const inC = w.inner ? `</div>` : "";
  const body =
    w.shape === "side"
      ? `<div class="${w.wrapper}">{{BCAVE_DS_NAV:${id}}}<main class="${w.main}">${inO}${content}${inC}</main></div>`
      : `{{BCAVE_DS_NAV:${id}}}<main class="${w.main}">${inO}${content}${inC}</main>`;

  const specJson = JSON.stringify({ kpis: spec.kpis, charts: spec.charts, tableCols: spec.tableCols, numericCols: spec.numericCols });

  return (
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${spec.title} · 현황</title>` +
    `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.min.css">` +
    `<script>{{BCAVE_CHARTJS}}</script>` +
    `<style>{{BCAVE_DS:${id}}} html{scroll-behavior:smooth} .num{text-align:right;font-variant-numeric:tabular-nums} ` +
    `th,td{padding:11px 14px;text-align:left;white-space:nowrap;border-bottom:1px solid var(--ds-border,#eee);font-size:13.5px}</style></head><body>` +
    body +
    `<script>window.__SPEC=${specJson};window.__DATA={{BCAVE_DATA:${dataFile}${sheet ? "#" + sheet : ""}}};</script>` +
    RENDER_SCRIPT +
    `{{BCAVE_DS_JS:${id}}}</body></html>`
  );
}

/** 파일 경로에서 데이터를 읽어 프로파일링 → 스펙까지 한 번에. rows 는 자리표시자로 별도 주입되므로 반환 스펙만 쓰면 된다. */
export function buildDashboardSpec(rows: Record<string, unknown>[], title: string): DashboardSpec {
  return buildSpec(profileColumns(rows), title);
}
