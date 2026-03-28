import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads', 'library');

// Create library uploads directory
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
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

// GET /api/library — List all batches for user (with file counts)
router.get('/', authMiddleware, (req, res) => {
  const { product_name, status } = req.query;
  let sql = `SELECT cb.*, pp.name as preset_name, pp.base_campaign_name
             FROM creative_batches cb
             LEFT JOIN product_presets pp ON cb.product_preset_id = pp.id
             WHERE cb.user_id = ?`;
  const params = [req.user.id];

  if (product_name) {
    sql += ' AND cb.product_name = ?';
    params.push(product_name);
  }
  if (status) {
    sql += ' AND cb.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY cb.created_at DESC';

  db.all(sql, params, (err, batches) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(batches || []);
  });
});

// GET /api/library/:batchId — Get batch detail with files
router.get('/:batchId', authMiddleware, (req, res) => {
  db.get(
    'SELECT * FROM creative_batches WHERE id = ? AND user_id = ?',
    [req.params.batchId, req.user.id],
    (err, batch) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!batch) return res.status(404).json({ error: 'Batch not found' });

      db.all(
        'SELECT * FROM creative_batch_files WHERE batch_id = ? ORDER BY created_at ASC',
        [batch.id],
        (err, files) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ ...batch, files: files || [] });
        }
      );
    }
  );
});

// POST /api/library/upload — Upload a new batch of creatives
router.post('/upload', authMiddleware, upload.array('files', 100), (req, res) => {
  const { product_preset_id, product_name, batch_date } = req.body;

  if (!product_name || !batch_date) {
    return res.status(400).json({ error: 'product_name y batch_date son requeridos' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se subieron archivos' });
  }

  // Detect creative type from uploaded files
  const hasVideo = req.files.some(f => f.mimetype.startsWith('video'));
  const hasImage = req.files.some(f => f.mimetype.startsWith('image'));
  const creative_type = hasVideo && hasImage ? 'mixto' : hasVideo ? 'videos' : 'estaticos';

  // Create batch record
  db.run(
    `INSERT INTO creative_batches (user_id, product_preset_id, product_name, batch_date, creative_type, files_count, status)
     VALUES (?, ?, ?, ?, ?, ?, 'uploaded')`,
    [req.user.id, product_preset_id || null, product_name, batch_date, creative_type, req.files.length],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const batchId = this.lastID;
      let processed = 0;
      const savedFiles = [];

      req.files.forEach((file) => {
        const fileType = file.mimetype.startsWith('video') ? 'video' : 'image';
        db.run(
          `INSERT INTO creative_batch_files (batch_id, filename, original_name, file_type, file_size)
           VALUES (?, ?, ?, ?, ?)`,
          [batchId, file.filename, file.originalname, fileType, file.size],
          function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });

            savedFiles.push({
              id: this.lastID,
              filename: file.filename,
              original_name: file.originalname,
              file_type: fileType,
              file_size: file.size
            });

            processed++;
            if (processed === req.files.length) {
              res.status(201).json({
                id: batchId,
                product_name,
                batch_date,
                creative_type,
                files_count: req.files.length,
                status: 'uploaded',
                files: savedFiles
              });
            }
          }
        );
      });
    }
  );
});

// PUT /api/library/:batchId/status — Update batch status (after publishing)
router.put('/:batchId/status', authMiddleware, (req, res) => {
  const { status, meta_campaign_id } = req.body;

  db.run(
    `UPDATE creative_batches SET status = ?, meta_campaign_id = ?, published_at = CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE published_at END
     WHERE id = ? AND user_id = ?`,
    [status, meta_campaign_id || null, status, req.params.batchId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Batch not found' });
      res.json({ message: 'Status updated' });
    }
  );
});

// DELETE /api/library/:batchId — Delete a batch and its files
router.delete('/:batchId', authMiddleware, (req, res) => {
  // First get the files to delete from disk
  db.all(
    'SELECT f.filename FROM creative_batch_files f JOIN creative_batches b ON f.batch_id = b.id WHERE b.id = ? AND b.user_id = ?',
    [req.params.batchId, req.user.id],
    (err, files) => {
      if (err) return res.status(500).json({ error: err.message });

      // Delete files from disk
      (files || []).forEach(f => {
        const filePath = path.join(uploadsDir, f.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

      // Delete batch (cascade deletes files records)
      db.run(
        'DELETE FROM creative_batches WHERE id = ? AND user_id = ?',
        [req.params.batchId, req.user.id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          if (this.changes === 0) return res.status(404).json({ error: 'Batch not found' });
          res.json({ message: 'Batch deleted' });
        }
      );
    }
  );
});

export default router;
