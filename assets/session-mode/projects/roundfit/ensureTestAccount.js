'use strict';

const bcrypt = require('bcryptjs');
const db = require('./db');
const { testAccount } = require('./config');

/**
 * 서버 시작 시 테스트 계정이 없으면 생성한다.
 * 이미 존재하면 아무 것도 하지 않는다 (idempotent).
 */
function ensureTestAccount() {
  const email = testAccount.email.toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`  테스트 계정 확인됨: ${email}`);
    return;
  }
  const hash = bcrypt.hashSync(testAccount.password, 10);
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    testAccount.name,
    email,
    hash,
    testAccount.role
  );
  console.log(`  테스트 계정 생성됨: ${email} / ${testAccount.password}`);
}

module.exports = ensureTestAccount;
