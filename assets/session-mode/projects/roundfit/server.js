'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const SqliteStore = require('./sessionStore');

const config = require('./config');
require('./db'); // 스키마 초기화
const ensureTestAccount = require('./ensureTestAccount');

ensureTestAccount(); // 테스트 계정이 없으면 생성

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const storeRoutes = require('./routes/stores');
const roundingRoutes = require('./routes/roundings');

const app = express();

// 뷰 엔진
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 미들웨어
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new SqliteStore(),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7일
  })
);

// 모든 뷰에서 현재 사용자 접근 가능하게
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, name: req.session.userName, role: req.session.userRole }
    : null;
  res.locals.activePath = req.path;
  next();
});

// 라우트
app.get('/', (req, res) => res.redirect(req.session.userId ? '/dashboard' : '/login'));
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/stores', storeRoutes);
app.use('/roundings', roundingRoutes);

// 404
app.use((req, res) => res.status(404).render('404', { title: '페이지 없음' }));

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('서버 오류가 발생했습니다.');
});

app.listen(config.port, () => {
  console.log(`\n  RoundFit 실행 중  →  http://localhost:${config.port}\n`);
});
