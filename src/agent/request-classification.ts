const APP_NOUN =
  /(서비스|애플리케이션|어플리케이션|어플\b|백엔드|backend|서버\b|\bserver\b|\bapi\b|엔드포인트|endpoint|데이터베이스|\bdb\b|회원가입|회원 ?관리|로그인 ?기능|인증 ?기능|\bauth\b|계정|crud|결제|주문 ?관리|재고|예약 ?(시스템|기능|서비스)|게시판|커뮤니티|채팅|메시지|실시간|알림|쇼핑몰|풀스택|full[- ]?stack|\bsaas\b|웹\s?서비스|웹앱|웹\s?애플리케이션|백오피스|관리자 ?(시스템|페이지|도구))/i;

/** 정적 목업이 아니라 실제 백엔드/데이터가 있는 애플리케이션을 만들라는 요청인가. */
export function isAppBuild(message?: string): boolean {
  if (!message) return false;
  if (/(목업|mockup|mock-up|시안|정적|static|한 ?페이지|단일 ?html|프로토타입 ?화면)/i.test(message)) return false;
  return APP_NOUN.test(message);
}

export type UiSurface = "auth" | "dashboard" | "platform";

/** 같은 디자인 시스템 안에서도 화면의 제품 성격에 맞는 구성을 선택한다. */
export function classifyUiSurface(message?: string): UiSurface {
  if (message && /(로그인|회원가입|가입 ?화면|비밀번호|인증 ?화면|sign[ -]?in|sign[ -]?up|forgot password|reset password|\bauth\b)/i.test(message)) {
    return "auth";
  }
  if (message && /(대시보드|dashboard|kpi|지표|차트|분석|analytics|리포트|보고서|통계)/i.test(message)) {
    return "dashboard";
  }
  return "platform";
}
