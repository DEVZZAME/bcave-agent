'use strict';

// 로그인 필요한 페이지 보호
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

// 이미 로그인한 사용자는 로그인/회원가입 페이지 접근 시 대시보드로
function redirectIfAuth(req, res, next) {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  return next();
}

module.exports = { requireAuth, redirectIfAuth };
