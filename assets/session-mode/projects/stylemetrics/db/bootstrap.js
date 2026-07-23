import db from './index.js';
import bcrypt from 'bcryptjs';

// Single source of truth for the built-in test/demo account.
export const DEMO = {
  name: 'Demo Merchandiser',
  email: 'demo@stylemetrics.app',
  password: 'demo1234',
};

// Create the demo account if it doesn't exist yet; leave it untouched if it does.
export function ensureDemoAccount() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO.email);
  if (existing) return false;
  db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(DEMO.name, DEMO.email, bcrypt.hashSync(DEMO.password, 10));
  return true;
}
