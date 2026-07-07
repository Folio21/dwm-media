import jwt from 'jsonwebtoken';

const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-in-production';

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired — please log in again' });
  }
}

export function signToken(username) {
  const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-in-production';
  return jwt.sign({ username }, SECRET, { expiresIn: '30d' });
}
