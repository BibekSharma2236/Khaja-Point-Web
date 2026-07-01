const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { openDb, run, get } = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function signToken({ userId, email, role }) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  return jwt.sign({ userId, email, role }, secret, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);

    const db = openDb();
    const existing = await get(db, 'SELECT id FROM users WHERE email = ?', [body.email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(body.password, 10);
    const result = await run(
      db,
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [body.name, body.email, hash, 'customer']
    );

    const userId = result.lastID;
    const token = signToken({ userId, email: body.email, role: 'customer' });

    return res.status(201).json({
      token,
      user: { userId, email: body.email, role: 'customer', name: body.name }
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid request', details: e?.issues || undefined });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const db = openDb();

    const user = await get(db, 'SELECT id, name, email, password_hash, role FROM users WHERE email = ?', [body.email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(body.password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return res.json({
      token,
      user: { userId: user.id, email: user.email, role: user.role, name: user.name }
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid request', details: e?.issues || undefined });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;

