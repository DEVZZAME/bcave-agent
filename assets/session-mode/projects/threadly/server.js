'use strict';

const path = require('path');
const express = require('express');
const { db } = require('./src/db');
const { attachUser } = require('./src/auth');

const authRoutes = require('./src/routes/auth');
const knowledgeRoutes = require('./src/routes/knowledge');
const onboardingRoutes = require('./src/routes/onboarding');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(attachUser);

// API
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/onboarding', onboardingRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'threadly' }));

// 깔끔한 URL (확장자 없이 접근): /login, /signup
const PUBLIC_DIR = path.join(__dirname, 'public');
app.get(['/login', '/signup'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, req.path.slice(1) + '.html'));
});
// 기존 .html 경로로 들어오면 깔끔한 URL 로 리다이렉트
app.get(['/login.html', '/signup.html'], (req, res) => {
  res.redirect(301, req.path.replace('.html', ''));
});

// 정적 파일 (css, js 등)
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// SPA 진입점 (로그인 여부는 클라이언트에서 /api/auth/me 로 확인)
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 시작 시:
//  - 빈 DB 면 전체 더미데이터 주입
//  - 데모(테스트) 계정이 없으면 생성, 있으면 무시
const { ensureDemoAccounts } = require('./src/seed');
ensureDemoAccounts();

app.listen(PORT, () => {
  console.log('\n👗 Threadly — 패션 사내 지식검색 AI + 온보딩');
  console.log(`   ▶ http://localhost:${PORT}`);
  console.log(
    process.env.ANTHROPIC_API_KEY
      ? '   ▶ AI 모드: Claude API 연동 활성화'
      : '   ▶ AI 모드: 오프라인 (ANTHROPIC_API_KEY 설정 시 Claude 연동)'
  );
  console.log('   ▶ 데모 계정: minji.kim@threadly.co / threadly123\n');
});
