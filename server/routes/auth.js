import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Simple password hashing with crypto
function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, 'salt-adpilot-2024', 1000, 64, 'sha512')
    .toString('hex');
}

function comparePassword(password, hash) {
  return hash === hashPassword(password);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = hashPassword(password);

    db.run(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, password_hash, name],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const userId = this.lastID;

        // Create default settings
        db.run('INSERT INTO settings (user_id) VALUES (?)', [userId], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const token = jwt.sign(
            { id: userId, email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.status(201).json({
            token,
            user: { id: userId, email, name }
          });
        });
      }
    );
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  });
});

// POST /api/auth/google - Login/register with Google
router.post('/google', (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'No credential provided' });
  }

  try {
    // Decode Google JWT token (basic base64 decode of payload)
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ error: 'No email in Google token' });
    }

    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existing) {
        // Update google_id if not set
        if (!existing.google_id) {
          db.run(
            'UPDATE users SET google_id = ?, name = COALESCE(name, ?) WHERE id = ?',
            [googleId, name, existing.id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              const token = jwt.sign(
                { id: existing.id, email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
              );

              res.json({
                token,
                user: { id: existing.id, email, name: existing.name || name }
              });
            }
          );
        } else {
          const token = jwt.sign(
            { id: existing.id, email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );

          res.json({
            token,
            user: { id: existing.id, email, name: existing.name || name }
          });
        }
        return;
      }

      // Create new user
      const displayName = name || email.split('@')[0];
      db.run(
        'INSERT INTO users (email, name, google_id, password_hash) VALUES (?, ?, ?, ?)',
        [email, displayName, googleId, 'google_oauth'],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Create default settings
          db.run('INSERT INTO settings (user_id) VALUES (?)', [this.lastID], (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
          }

            const token = jwt.sign(
              { id: this.lastID, email },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
            );

            res.json({
              token,
              user: { id: this.lastID, email, name: displayName }
            });
          });
        }
      );
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Error authenticating with Google' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  db.get(
    'SELECT id, email, name, plan, meta_connected FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    }
  );
});

// GET /api/auth/google-client-id
router.get('/google-client-id', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  res.json({ clientId });
});

export default router;
