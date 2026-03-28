import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/products — List all product presets for user
router.get('/', authMiddleware, (req, res) => {
  db.all(
    'SELECT * FROM product_presets WHERE user_id = ? ORDER BY name ASC',
    [req.user.id],
    (err, products) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(products || []);
    }
  );
});

// POST /api/products — Create product preset
router.post('/', authMiddleware, (req, res) => {
  const { name, ad_account_id, base_campaign_id, base_campaign_name, daily_budget, product_link,
          default_body, default_title, default_description, default_cta, default_objective, is_default_account } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name es requerido' });
  }

  // If marking as default account, clear other defaults first
  const proceed = () => {
    db.run(
      `INSERT INTO product_presets (user_id, name, ad_account_id, base_campaign_id, base_campaign_name, daily_budget, product_link,
        default_body, default_title, default_description, default_cta, default_objective, is_default_account)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, ad_account_id || null, base_campaign_id || null, base_campaign_name || null, daily_budget || 40, product_link || null,
       default_body || null, default_title || null, default_description || null, default_cta || 'SHOP_NOW', default_objective || 'OUTCOME_SALES', is_default_account ? 1 : 0],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM product_presets WHERE id = ?', [this.lastID], (err, product) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json(product);
        });
      }
    );
  };

  if (is_default_account) {
    db.run('UPDATE product_presets SET is_default_account = 0 WHERE user_id = ?', [req.user.id], () => proceed());
  } else {
    proceed();
  }
});

// PUT /api/products/:id — Update product preset
router.put('/:id', authMiddleware, (req, res) => {
  const { name, ad_account_id, base_campaign_id, base_campaign_name, daily_budget, product_link } = req.body;

  db.run(
    `UPDATE product_presets SET name = ?, ad_account_id = ?, base_campaign_id = ?, base_campaign_name = ?, daily_budget = ?, product_link = ?
     WHERE id = ? AND user_id = ?`,
    [name, ad_account_id, base_campaign_id, base_campaign_name, daily_budget, product_link, req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
      db.get('SELECT * FROM product_presets WHERE id = ?', [req.params.id], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(product);
      });
    }
  );
});

// PATCH /api/products/:id — Partial update product preset
router.patch('/:id', authMiddleware, (req, res) => {
  const { name, ad_account_id, base_campaign_id, base_campaign_name, daily_budget, product_link,
          default_body, default_title, default_description, default_cta, default_objective, is_default_account } = req.body;

  // Build dynamic SET clause for partial updates
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (ad_account_id !== undefined) { fields.push('ad_account_id = ?'); values.push(ad_account_id); }
  if (base_campaign_id !== undefined) { fields.push('base_campaign_id = ?'); values.push(base_campaign_id); }
  if (base_campaign_name !== undefined) { fields.push('base_campaign_name = ?'); values.push(base_campaign_name); }
  if (daily_budget !== undefined) { fields.push('daily_budget = ?'); values.push(daily_budget); }
  if (product_link !== undefined) { fields.push('product_link = ?'); values.push(product_link); }
  if (default_body !== undefined) { fields.push('default_body = ?'); values.push(default_body); }
  if (default_title !== undefined) { fields.push('default_title = ?'); values.push(default_title); }
  if (default_description !== undefined) { fields.push('default_description = ?'); values.push(default_description); }
  if (default_cta !== undefined) { fields.push('default_cta = ?'); values.push(default_cta); }
  if (default_objective !== undefined) { fields.push('default_objective = ?'); values.push(default_objective); }
  if (is_default_account !== undefined) { fields.push('is_default_account = ?'); values.push(is_default_account ? 1 : 0); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id, req.user.id);

  const doUpdate = () => {
    db.run(
      `UPDATE product_presets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values,
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
        db.get('SELECT * FROM product_presets WHERE id = ?', [req.params.id], (err, product) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(product);
        });
      }
    );
  };

  // If marking as default, clear others first
  if (is_default_account) {
    db.run('UPDATE product_presets SET is_default_account = 0 WHERE user_id = ? AND id != ?', [req.user.id, req.params.id], () => doUpdate());
  } else {
    doUpdate();
  }
});

// DELETE /api/products/:id — Delete product preset
router.delete('/:id', authMiddleware, (req, res) => {
  db.run(
    'DELETE FROM product_presets WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
      res.json({ message: 'Product deleted' });
    }
  );
});

export default router;
