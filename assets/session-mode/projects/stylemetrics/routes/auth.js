import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { signToken, cookieOptions, COOKIE_NAME, requireAuth } from '../middleware/auth.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/signup', (req, res) => {
  const name = (req.body?.name || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!name) return res.status(400).json({ error: '이름을 입력해 주세요.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: '올바른 이메일 주소를 입력해 주세요.' });
  if (password.length < 6) return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: '이미 가입된 이메일입니다.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hash);

  const user = { id: info.lastInsertRowid, email, name };
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions);
  res.status(201).json({ user });
});

router.post('/login', (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }

  const user = { id: row.id, email: row.email, name: row.name };
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions);
  res.json({ user });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name } });
});

export default router;
