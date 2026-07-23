'use strict';

const express = require('express');
const { db } = require('../db');
const {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} = require('../auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 온보딩 진행 레코드를 신규 회원에게 자동 배정 */
function assignOnboarding(userId, departmentId) {
  const tasks = db
    .prepare(
      `SELECT id FROM onboarding_tasks
        WHERE department_id IS NULL OR department_id = ?
        ORDER BY sort_order`
    )
    .all(departmentId);
  const insert = db.prepare(
    'INSERT OR IGNORE INTO onboarding_progress (user_id, task_id, done) VALUES (?, ?, 0)'
  );
  for (const t of tasks) insert.run(userId, t.id);
}

// 회원가입
router.post('/signup', (req, res) => {
  const { name, email, password, departmentId, jobTitle } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: '이름, 이메일, 비밀번호를 모두 입력해 주세요.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const dept = departmentId
    ? db.prepare('SELECT id FROM departments WHERE id = ?').get(Number(departmentId))
    : null;
  if (departmentId && !dept) {
    return res.status(400).json({ error: '존재하지 않는 부서입니다.' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
  }

  const hash = hashPassword(String(password));
  let info;
  try {
    info = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, department_id, job_title)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(name, email, hash, dept ? dept.id : null, jobTitle || null);
  } catch (e) {
    return res.status(500).json({ error: '가입 처리 중 오류가 발생했습니다.' });
  }

  const userId = Number(info.lastInsertRowid);
  if (dept) assignOnboarding(userId, dept.id);

  const token = createSession(userId);
  setSessionCookie(res, token);
  res.status(201).json({ ok: true, message: '가입이 완료되었습니다.' });
});

// 로그인
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해 주세요.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }
  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json({ ok: true, message: '로그인되었습니다.' });
});

// 로그아웃
router.post('/logout', (req, res) => {
  destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

// 현재 사용자
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  res.json({ user: req.user });
});

// 부서 목록 (가입 폼에서 사용, 공개)
router.get('/departments', (req, res) => {
  const rows = db.prepare('SELECT id, name, slug, description FROM departments ORDER BY id').all();
  res.json({ departments: rows });
});

module.exports = router;
