import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/integrations/meta/connect
router.post('/meta/connect', authMiddleware, (req, res) => {
  const { meta_account_id } = req.body;

  if (!meta_account_id) {
    return res.status(400).json({ error: 'meta_account_id is required' });
  }

  db.run(
    'UPDATE users SET meta_account_id = ?, meta_connected = 1 WHERE id = ?',
    [meta_account_id, req.user.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Meta account connected' });
    }
  );
});

// DELETE /api/integrations/meta/disconnect
router.delete('/meta/disconnect', authMiddleware, (req, res) => {
  db.run(
    'UPDATE users SET meta_account_id = NULL, meta_connected = 0 WHERE id = ?',
    [req.user.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Meta account disconnected' });
    }
  );
});

// GET /api/integrations/meta/status
router.get('/meta/status', authMiddleware, (req, res) => {
  db.get(
    'SELECT meta_connected, meta_account_id FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        connected: Boolean(user?.meta_connected),
        meta_account_id: user?.meta_account_id || null
      });
    }
  );
});

export default router;
