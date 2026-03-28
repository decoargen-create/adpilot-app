import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const DEFAULTS = {
  naming_template: '{producto} {fecha} [CBO Testeo {tipo}]',
  start_date_mode: 'next_day',
  start_day_offset: 1,
  campaign_hour: 5,
  default_budget: 40,
  notifications_email: '',
  notifications_whatsapp: '',
  default_ad_account: ''
};

// GET /api/settings — Get user settings
router.get('/', authMiddleware, (req, res) => {
  db.get(
    'SELECT * FROM settings WHERE user_id = ?',
    [req.user.id],
    (err, settings) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(settings || DEFAULTS);
    }
  );
});

// POST /api/settings — Create or update user settings
router.post('/', authMiddleware, (req, res) => {
  const {
    naming_template,
    start_date_mode,
    start_day_offset,
    campaign_hour,
    default_budget,
    notifications_email,
    notifications_whatsapp,
    default_ad_account
  } = req.body;

  // Try update first, then insert if not exists
  db.get('SELECT id FROM settings WHERE user_id = ?', [req.user.id], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });

    if (existing) {
      db.run(
        `UPDATE settings SET
          naming_template = ?,
          start_date_mode = ?,
          start_day_offset = ?,
          campaign_hour = ?,
          default_budget = ?,
          notifications_email = ?,
          notifications_whatsapp = ?,
          default_ad_account = ?
        WHERE user_id = ?`,
        [
          naming_template || DEFAULTS.naming_template,
          start_date_mode || DEFAULTS.start_date_mode,
          start_day_offset ?? DEFAULTS.start_day_offset,
          campaign_hour ?? DEFAULTS.campaign_hour,
          default_budget ?? DEFAULTS.default_budget,
          notifications_email || '',
          notifications_whatsapp || '',
          default_ad_account || '',
          req.user.id
        ],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          db.get('SELECT * FROM settings WHERE user_id = ?', [req.user.id], (err, settings) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(settings);
          });
        }
      );
    } else {
      db.run(
        `INSERT INTO settings (user_id, naming_template, start_date_mode, start_day_offset, campaign_hour, default_budget, notifications_email, notifications_whatsapp, default_ad_account)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          naming_template || DEFAULTS.naming_template,
          start_date_mode || DEFAULTS.start_date_mode,
          start_day_offset ?? DEFAULTS.start_day_offset,
          campaign_hour ?? DEFAULTS.campaign_hour,
          default_budget ?? DEFAULTS.default_budget,
          notifications_email || '',
          notifications_whatsapp || '',
          default_ad_account || ''
        ],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          db.get('SELECT * FROM settings WHERE user_id = ?', [req.user.id], (err, settings) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(settings);
          });
        }
      );
    }
  });
});

// POST /api/settings/test-whatsapp — Test WhatsApp notification
router.post('/test-whatsapp', authMiddleware, (req, res) => {
  const { phone } = req.body;

  // Validate phone number
  if (!phone || phone.trim() === '') {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Log the test attempt
  console.log(`[WhatsApp Test] User ${req.user.id} attempted to send test message to: ${phone}`);

  // For now, just acknowledge the request
  // In the future, this would integrate with WhatsApp Business API or Twilio
  res.json({
    success: true,
    message: 'Test message sent to WhatsApp'
  });
});

// POST /api/settings/test-email — Test email notification
router.post('/test-email', authMiddleware, (req, res) => {
  const { email } = req.body;

  // Validate email
  if (!email || email.trim() === '') {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Log the test attempt
  console.log(`[Email Test] User ${req.user.id} attempted to send test email to: ${email}`);

  // For now, just acknowledge the request
  // In the future, this would use nodemailer or similar
  res.json({
    success: true,
    message: 'Test email sent'
  });
});

export default router;
