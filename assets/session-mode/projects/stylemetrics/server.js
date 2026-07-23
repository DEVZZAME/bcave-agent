import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import jwt from 'jsonwebtoken';

import { initSchema } from './db/index.js';
import { ensureDemoAccount, DEMO } from './db/bootstrap.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import { JWT_SECRET, COOKIE_NAME } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

initSchema();

// Make sure the test account always exists on startup (created once, then ignored).
const created = ensureDemoAccount();
console.log(created
  ? `  Demo account created →  ${DEMO.email} / ${DEMO.password}`
  : `  Demo account ready →  ${DEMO.email} / ${DEMO.password}`);

app.use(express.json());
app.use(cookieParser());

// API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Gate the dashboard page: bounce unauthenticated visitors to login.
app.get('/dashboard', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  try {
    jwt.verify(token, JWT_SECRET);
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  } catch {
    res.redirect('/');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`\n  StyleMetrics running →  http://localhost:${PORT}\n`);
});
