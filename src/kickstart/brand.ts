// 회사 CI(B.CAVE 로고). 대시보드 등 시각 결과물 헤더에 항상 삽입한다.
// 단일 파일·저토큰 제약을 위해 compact 인라인 SVG(currentColor)로 내장.
// 두 도형 마크(작은 언덕 + 큰 물방울) + "B.CAVE" 워드마크. 색은 부모 color 를 따른다.

export const BCAVE_LOGO_SVG =
  '<svg class="bcave-ci" viewBox="0 0 322 64" role="img" aria-label="B.CAVE" ' +
  'xmlns="http://www.w3.org/2000/svg" fill="currentColor">' +
  '<path d="M18 26c6 0 11 6 11 14v14c0 1.7-1.3 3-3 3H9c-2.2 0-3.7-2-3-4 4-15 6-27 12-27z"/>' +
  '<path d="M56 8c11 0 17 11 17 23 0 14-10 26-25 26H37c-3.3 0-4.6-2.3-3.6-5.4C39 30 45 8 56 8z"/>' +
  '<text x="88" y="51" font-family="Pretendard,-apple-system,BlinkMacSystemFont,sans-serif" ' +
  'font-size="47" font-weight="800" letter-spacing="-1.5">B.CAVE</text>' +
  "</svg>";

/** 시각 결과물 생성 프롬프트에 붙일 CI 삽입 지침 (+ 실제 SVG). */
export const BCAVE_BRAND =
  "[회사 CI — 항상 포함]\n" +
  "화면 좌상단(헤더 또는 사이드바 최상단)에 아래 B.CAVE 회사 로고 SVG 를 **그대로 인라인**으로 넣어라. " +
  "높이 22~28px 로, 로고 색은 배경에 맞춰(밝은 배경=검정, 어두운 배경=흰색) `color` 로 지정해 currentColor 가 따르게 해. " +
  "로고 형태·비율을 임의로 바꾸지 말 것.\n" +
  BCAVE_LOGO_SVG;
