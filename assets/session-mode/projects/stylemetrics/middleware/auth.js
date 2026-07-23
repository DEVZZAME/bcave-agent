import jwt from 'jsonwebtoken';

// For a local dev app we fall back to a static secret. Override with env in prod.
export const JWT_SECRET = process.env.JWT_SECRET || 'stylemetrics-dev-secret-change-me';
export const COOKIE_NAME = 'sm_token';

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false, // local http
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
