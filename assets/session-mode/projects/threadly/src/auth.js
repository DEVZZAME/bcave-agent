'use strict';

const crypto = require('node:crypto');
const { db } = require('./db');

const SESSION_COOKIE = 'threadly_session';
const SESSION_TTL_DAYS = 7;

/** scrypt 기반 비밀번호 해시 (salt 포함, 외부 의존성 없음) */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(derived, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** 세션 생성 → 토큰 반환 */
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 864e5)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, userId, expires);
  return token;
}

function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function getUserByToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role, u.job_title,
              u.department_id, d.name AS department_name, d.slug AS department_slug
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN departments d ON d.id = u.department_id
        WHERE s.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at.replace(' ', 'T')) < new Date()) {
    destroySession(token);
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    jobTitle: row.job_title,
    departmentId: row.department_id,
    departmentName: row.department_name,
    departmentSlug: row.department_slug,
  };
}

/** 쿠키 파서 (외부 의존성 없이) */
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  });
  return out;
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_TTL_DAYS * 864e5;
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(
      maxAge / 1000
    )}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
}

/** 모든 요청에 req.user 부착 */
function attachUser(req, res, next) {
  const cookies = parseCookies(req);
  req.sessionToken = cookies[SESSION_COOKIE] || null;
  req.user = getUserByToken(req.sessionToken);
  next();
}

/** 로그인 필수 API 가드 */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  next();
}

module.exports = {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getUserByToken,
  setSessionCookie,
  clearSessionCookie,
  attachUser,
  requireAuth,
};
