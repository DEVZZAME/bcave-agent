'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { redirectIfAuth } = require('../middleware/auth');
const { testAccount } = require('../config');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- 회원가입 ----
router.get('/signup', redirectIfAuth, (req, res) => {
  res.render('signup', { title: '회원가입', error: null, form: {} });
});

router.post('/signup', redirectIfAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const passwordConfirm = req.body.passwordConfirm || '';
  const role = ['staff', 'manager', 'admin'].includes(req.body.role) ? req.body.role : 'staff';

  const form = { name, email, role };
  const fail = (msg) => res.status(400).render('signup', { title: '회원가입', error: msg, form });

  if (!name || !email || !password) return fail('모든 필수 항목을 입력해 주세요.');
  if (!EMAIL_RE.test(email)) return fail('올바른 이메일 형식이 아닙니다.');
  if (password.length < 6) return fail('비밀번호는 최소 6자 이상이어야 합니다.');
  if (password !== passwordConfirm) return fail('비밀번호가 일치하지 않습니다.');

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return fail('이미 가입된 이메일입니다.');

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, password_hash, role);

  req.session.userId = info.lastInsertRowid;
  req.session.userName = name;
  req.session.userRole = role;
  res.redirect('/dashboard');
});

// ---- 로그인 ----
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', {
    title: '로그인',
    error: null,
    form: { email: testAccount.email, password: testAccount.password },
  });
});

router.post('/login', redirectIfAuth, (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const fail = () =>
    res.status(401).render('login', {
      title: '로그인',
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
      form: { email },
    });

  if (!email || !password) return fail();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return fail();
  if (!bcrypt.compareSync(password, user.password_hash)) return fail();

  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userRole = user.role;
  res.redirect('/dashboard');
});

// ---- 로그아웃 ----
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = router;
