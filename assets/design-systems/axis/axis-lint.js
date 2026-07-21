#!/usr/bin/env node
/* AXIS Design System Lint v0.1
   사용: node axis-lint.js <생성된.html> [--ui path/to/axis-ui.css] [--json]
   종료코드: 0 = 통과, 1 = 위반 존재
   BCAVE:와 차이 — 팔레트 순환은 AXIS의 설계 의도이므로 경고하지 않는다.
   BCAVE:ASSET 대신 AXIS:ASSET / AXIS:DATA 마커를 사용한다. */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const asJson = args.includes('--json');
const uiFlag = args.indexOf('--ui');
const uiPath = uiFlag >= 0 ? args[uiFlag + 1] : path.join(__dirname, 'axis-ui.css');

if (!file) { console.error('사용법: node axis-lint.js <html파일> [--ui ui.css] [--json]'); process.exit(2); }
const html = fs.readFileSync(file, 'utf8');

/* ---------- 허용 색상 (axis-tokens.css 전체) ---------- */
const ALLOWED_HEX = new Set([
  'FBFCFD','F7F8FA','EEF0F4','E1E4EB','C9CEDA','A3AABC','7B8399','5A6275','414958','2B313D','1A1F29',
  'EEF2FF','DCE4FF','B8C8FF','8AA3FF','5C7DF5','3560E8','274CC7','1E3CA0','172E7B','112158',
  'E9F9EF','12A150','0E8443','FEECEC','E5484D','C93A40',
  'FEF5E0','EFA008','C98508','0FA3A3','7C5CFC','E85C90',
  'FFFFFF','8FE3C0', // pre.code 강조용 파생
  'CDEDD9','0B5C30','FBE3AD','8A5D07','FBCFD0','93262A' // alert 톤 파생
]);

function stripAssets(src) {
  return src.replace(/<(style|script)\b[^>]*>([\s\S]*?)<\/\1>/gi, (m, tag, body) =>
    /AXIS:(ASSET|DATA)/.test(body.slice(0, 200)) ? `<!--stripped:${tag}-->` : m);
}
const target = stripAssets(html);
function lineOf(idx) { return target.slice(0, idx).split('\n').length; }

const violations = [];
const warnings = [];
function V(rule, msg, idx) { violations.push({ rule, msg, line: idx != null ? lineOf(idx) : null }); }
function W(rule, msg, idx) { warnings.push({ rule, msg, line: idx != null ? lineOf(idx) : null }); }

/* R1: 자산 외 <style> */
for (const m of target.matchAll(/<style\b[^>]*>/gi))
  V('R1-no-style-block', '자산 마커 없는 <style> 블록 — 모델은 CSS를 작성할 수 없음', m.index);

/* R2: 인라인 style= */
for (const m of target.matchAll(/\sstyle\s*=\s*["'][^"']*["']/gi))
  V('R2-no-inline-style', `인라인 style 금지: ${m[0].trim().slice(0, 60)} — 유틸 클래스(.w-70 등) 사용`, m.index);

/* R3: 하드코딩 색 */
for (const m of target.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
  if (!ALLOWED_HEX.has(m[1].toUpperCase()))
    V('R3-alien-hex', `허용 목록 외 색상 #${m[1]}`, m.index);
}
for (const m of target.matchAll(/rgba?\([^)]*\)/gi))
  V('R3-no-rgb', `rgb/rgba 직접 사용 금지: ${m[0].slice(0, 40)}`, m.index);

/* R4: font-family */
for (const m of target.matchAll(/font-family\s*:/gi))
  V('R4-no-font', 'font-family 선언 금지 — 폰트는 시스템이 관리', m.index);

/* R5: new Chart 직접 호출 */
for (const m of target.matchAll(/new\s+Chart\s*\(/g))
  V('R5-no-raw-chart', 'new Chart() 직접 호출 금지 — AXIS.chart.* 래퍼 사용', m.index);

/* R6: 미정의 클래스 */
let uiClasses = new Set();
try {
  const ui = fs.readFileSync(uiPath, 'utf8');
  for (const m of ui.matchAll(/\.([a-zA-Z][\w-]*)/g)) uiClasses.add(m[1]);
} catch { W('R6-ui-missing', `axis-ui.css를 찾지 못해 클래스 검사 생략 (${uiPath})`); }
if (uiClasses.size) {
  const used = new Set();
  for (const m of target.matchAll(/class\s*=\s*["']([^"']+)["']/gi))
    m[1].split(/\s+/).forEach(c => c && used.add(c));
  const IGNORE = new Set(['on','done','now','open']);
  for (const c of used)
    if (!uiClasses.has(c) && !IGNORE.has(c))
      W('R6-unknown-class', `axis-ui.css에 없는 클래스 "${c}" — 발명 금지, 표준 클래스 사용`);
}

/* R7: 금액 포맷 */
for (const m of target.matchAll(/[\d,]{7,}\s*원/g))
  V('R7-krw-format', `원화 원시 표기 "${m[0]}" — AXIS.fmt.krw() 사용 (₩·만/억 축약)`, m.index);
for (const m of target.matchAll(/toLocaleString\s*\(/g))
  W('R7-format-bypass', 'toLocaleString 직접 호출 — AXIS.fmt.* 경유 권장', m.index);

/* R9: delta 오용 */
for (const m of target.matchAll(/class\s*=\s*["'][^"']*\bdelta\b[^"']*["'][^>]*>([^<]{1,40})</gi)) {
  const t = m[1].trim();
  if (t && !/[%▲▼\d$]|\$\{/.test(t))
    W('R9-delta-misuse', `.delta에 설명 텍스트 "${t}" — 증감률 전용, 설명은 .sub 사용`, m.index);
}

/* R10: 이중축 (AXIS는 팔레트 순환을 금지하지 않음 — BCAVE와 차이) */
if (/yAxisID|secondaryValAxis/.test(target))
  V('R10-no-dual-axis', '이중 Y축 사용 금지', target.search(/yAxisID|secondaryValAxis/));

/* R11: 밀도 재정의 (컴포넌트 크기를 직접 override) */
for (const m of target.matchAll(/(--control-height-\w+|--kpi-value-size|--table-row-height)\s*:/g))
  V('R11-no-density-override', `밀도 토큰 직접 재정의 금지: ${m[1]} — data-density 속성 사용`, m.index);

const result = { file: path.basename(file), violations, warnings, pass: violations.length === 0 };
if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\nAXIS Lint — ${result.file}`);
  console.log('─'.repeat(52));
  if (!violations.length && !warnings.length) console.log('✔ 위반 없음');
  for (const v of violations) console.log(`✘ [${v.rule}]${v.line ? ' L' + v.line : ''} ${v.msg}`);
  for (const w of warnings)  console.log(`△ [${w.rule}]${w.line ? ' L' + w.line : ''} ${w.msg}`);
  console.log('─'.repeat(52));
  console.log(`위반 ${violations.length} · 경고 ${warnings.length} → ${result.pass ? 'PASS' : 'FAIL'}`);
}
process.exit(result.pass ? 0 : 1);
