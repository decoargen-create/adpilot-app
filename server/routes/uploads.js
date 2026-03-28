import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
});

const router = express.Router();

// POST /api/uploads/:campaignId
router.post('/:campaignId', authMiddleware, upload.array('files', 100), (req, res) => {
  const { campaignId } = req.params;

  db.get(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
    [campaignId, req.user.id],
    (err, campaign) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const creatives = [];
      let processedCount = 0;

      req.files.forEach((file, index) => {
        const fileType = file.mimetype.startsWith('video') ? 'video' : 'image';

        db.run(
          `INSERT INTO creatives (campaign_id, filename, original_name, file_type, file_path, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [campaignId, file.filename, file.originalname, fileType, `/uploads/${file.filename}`, index],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            creatives.push({
              id: this.lastID,
              campaign_id: campaignId,
              filename: file.filename,
              original_name: file.originalname,
              file_type: fileType,
              file_path: `/uploads/${file.filename}`,
              sort_order: index
            });

            processedCount++;

            if (processedCount === req.files.length) {
              db.get('SELECT COUNT(*) as count FROM creatives WHERE campaign_id = ?', [campaignId], (err, result) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                const creativesCount = result?.count || 0;
                db.run('UPDATE campaigns SET creatives_count = ? WHERE id = ?', [creativesCount, campaignId], (err) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }
                  res.status(201).json({ creatives, count: creativesCount });
                });
              });
            }
          }
        );
      });
    }
  );
});

// DELETE /api/uploads/:creativeId
router.delete('/:creativeId', authMiddleware, (req, res) => {
  const { creativeId } = req.params;

  db.get(
    'SELECT cr.* FROM creatives cr JOIN campaigns c ON cr.campaign_id = c.id WHERE cr.id = ? AND c.user_id = ?',
    [creativeId, req.user.id],
    (err, creative) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!creative) {
        return res.status(404).json({ error: 'Creative not found' });
      }

      const filePath = path.join(uploadsDir, creative.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      db.run('DELETE FROM creatives WHERE id = ?', [creativeId], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.get('SELECT COUNT(*) as count FROM creatives WHERE campaign_id = ?', [creative.campaign_id], (err, result) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const creativesCount = result?.count || 0;
          db.run('UPDATE campaigns SET creatives_count = ? WHERE id = ?', [creativesCount, creative.campaign_id], (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Creative deleted' });
          });
        });
      });
    }
  );
});

export default router;
