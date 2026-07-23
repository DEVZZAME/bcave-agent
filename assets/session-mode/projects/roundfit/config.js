'use strict';

require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'roundfit-dev-secret-change-me',
  // 개발용 테스트 계정 — 서버 시작 시 없으면 자동 생성되고, 로그인 화면에 기본 입력된다.
  testAccount: {
    name: '관리자',
    email: 'admin@roundfit.com',
    password: 'test1234',
    role: 'admin',
  },
  // 라운딩 점검 항목 템플릿 (패션 매장 기준)
  checklistCategories: [
    'VMD / 진열',
    '청결 / 위생',
    '재고 / 물류',
    '고객 응대 / 서비스',
    '프로모션 / POP',
    '안전 / 시설',
  ],
};
