import express from 'express';
import { signToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/login  { username, password }
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Each user's password is stored as an env var: USER_<NAME>_PASSWORD
  // e.g. USER_DAVID_PASSWORD=abc123  USER_PARTNER_PASSWORD=xyz789
  const key      = `USER_${username.toUpperCase()}_PASSWORD`;
  const expected = process.env[key];

  if (!expected || password !== expected) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signToken(username.toLowerCase());
  res.json({ token, username: username.toLowerCase() });
});

export default router;
