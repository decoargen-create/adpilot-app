import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Helper: Get user's Meta access token from meta_connections table or fallback to users table
async function getUserMetaAccessToken(userId) {
  return new Promise((resolve, reject) => {
    // Try meta_connections first
    db.get(
      'SELECT access_token FROM meta_connections WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId],
      (err, connection) => {
        if (err) return reject(err);
        if (connection) {
          return resolve(connection.access_token);
        }

        // Fallback to users table
        db.get(
          'SELECT meta_access_token FROM users WHERE id = ?',
          [userId],
          (err, user) => {
            if (err) reject(err);
            else resolve(user?.meta_access_token || null);
          }
        );
      }
    );
  });
}

// GET /api/campaigns
router.get('/', authMiddleware, (req, res) => {
  db.all(
    `SELECT
      c.id, c.name, c.product, c.date, c.type, c.budget, c.status,
      c.creatives_count, c.meta_campaign_id, c.published_at, c.created_at,
      c.archived, c.meta_status,
      COUNT(cr.id) as actual_creatives_count
    FROM campaigns c
    LEFT JOIN creatives cr ON c.id = cr.campaign_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.created_at DESC`,
    [req.user.id],
    (err, campaigns) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(campaigns || []);
    }
  );
});

// POST /api/campaigns
router.post('/', authMiddleware, (req, res) => {
  const { product, date, type, budget } = req.body;

  if (!product || !date || !type || !budget) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.get('SELECT naming_template FROM settings WHERE user_id = ?', [req.user.id], (err, settings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    let name = settings?.naming_template || '{producto} {fecha} [CBO Testeo {tipo}]';
    name = name
      .replace('{producto}', product)
      .replace('{fecha}', date)
      .replace('{tipo}', type)
      .replace('{presupuesto}', budget);

    db.run(
      'INSERT INTO campaigns (user_id, name, product, date, type, budget) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, product, date, type, budget],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.get('SELECT * FROM campaigns WHERE id = ?', [this.lastID], (err, campaign) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json(campaign);
        });
      }
    );
  });
});

// GET /api/campaigns/stats — MUST be before /:id to avoid being caught by it
router.get('/stats', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.get('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND status = ?', [userId, 'active'], (err, activeResult) => {
    if (err) return res.status(500).json({ error: err.message });

    db.get('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND status = ?', [userId, 'scheduled'], (err, scheduledResult) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ?', [userId], (err, totalResult) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT COALESCE(SUM(budget), 0) as total FROM campaigns WHERE user_id = ?', [userId], (err, spendResult) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({
            active: activeResult?.count || 0,
            scheduled: scheduledResult?.count || 0,
            total: totalResult?.count || 0,
            totalSpend: spendResult?.total || 0
          });
        });
      });
    });
  });
});

// GET /api/campaigns/:id
router.get('/:id', authMiddleware, (req, res) => {
  db.get(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, campaign) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      db.all(
        'SELECT * FROM creatives WHERE campaign_id = ? ORDER BY sort_order',
        [req.params.id],
        (err, creatives) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ ...campaign, creatives: creatives || [] });
        }
      );
    }
  );
});

// PATCH /api/campaigns/:id
router.patch('/:id', authMiddleware, (req, res) => {
  const { status, meta_campaign_id } = req.body;

  db.get(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, campaign) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const updates = [];
      const params = [];

      if (status) { updates.push('status = ?'); params.push(status); }
      if (meta_campaign_id) { updates.push('meta_campaign_id = ?'); params.push(meta_campaign_id); }
      if (status === 'active') { updates.push('published_at = CURRENT_TIMESTAMP'); }

      if (updates.length === 0) {
        return res.json(campaign);
      }

      params.push(req.params.id);

      db.run(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`, params, (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.get('SELECT * FROM campaigns WHERE id = ?', [req.params.id], (err, updated) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json(updated);
        });
      });
    }
  );
});

// DELETE /api/campaigns/:id
router.delete('/:id', authMiddleware, (req, res) => {
  db.get(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, campaign) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      db.run('DELETE FROM campaigns WHERE id = ?', [req.params.id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Campaign deleted' });
      });
    }
  );
});

// POST /api/campaigns/sync — Syncs local campaigns with Meta Ads
// Marks campaigns deleted in Meta as 'deleted_in_meta' and updates status for existing ones
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const accessToken = await getUserMetaAccessToken(req.user.id);
    if (!accessToken) {
      return res.status(400).json({ error: 'Meta account not connected' });
    }

    const META_API_BASE = 'https://graph.facebook.com/v21.0';

        db.all(
          'SELECT id, meta_campaign_id, status FROM campaigns WHERE user_id = ? AND meta_campaign_id IS NOT NULL AND archived = 0',
          [req.user.id],
          async (err, campaigns) => {
            if (err) return res.status(500).json({ error: err.message });

            let deletedCount = 0;
            let updatedCount = 0;

            for (const campaign of campaigns || []) {
              try {
                const metaResponse = await fetch(
                  `${META_API_BASE}/${campaign.meta_campaign_id}?access_token=${accessToken}&fields=id,status,effective_status`
                );
                const metaData = await metaResponse.json();

                if (metaData.error) {
                  // Campaign no longer exists in Meta — mark as deleted
                  await new Promise((resolve, reject) => {
                    db.run(
                      'UPDATE campaigns SET status = ?, meta_status = ? WHERE id = ? AND user_id = ?',
                      ['deleted_in_meta', 'DELETED', campaign.id, req.user.id],
                      (err) => err ? reject(err) : resolve()
                    );
                  });
                  deletedCount++;
                } else {
                  // Campaign exists — update its status from Meta
                  const metaStatus = metaData.effective_status || metaData.status || null;
                  if (metaStatus) {
                    await new Promise((resolve, reject) => {
                      db.run(
                        'UPDATE campaigns SET meta_status = ? WHERE id = ? AND user_id = ?',
                        [metaStatus, campaign.id, req.user.id],
                        (err) => err ? reject(err) : resolve()
                      );
                    });
                    updatedCount++;
                  }
                }
              } catch (error) {
                console.error(`Error checking campaign ${campaign.meta_campaign_id}:`, error);
              }
            }

            res.json({
              message: 'Sync completed',
              deletedCount,
              updatedCount,
              total: (campaigns || []).length
            });
          }
        );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/campaigns/:id/archive — Archive a campaign
router.post('/:id/archive', authMiddleware, (req, res) => {
  db.run(
    'UPDATE campaigns SET archived = 1 WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Campaign not found' });
      res.json({ message: 'Campaign archived' });
    }
  );
});

// POST /api/campaigns/:id/unarchive — Unarchive a campaign
router.post('/:id/unarchive', authMiddleware, (req, res) => {
  db.run(
    'UPDATE campaigns SET archived = 0 WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Campaign not found' });
      res.json({ message: 'Campaign unarchived' });
    }
  );
});

// GET /api/campaigns/metrics — Gets real metrics from Meta for all campaigns
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    // Get user's Meta access token
    const accessToken = await getUserMetaAccessToken(req.user.id);
    if (!accessToken) {
      return res.status(400).json({ error: 'Meta account not connected' });
    }

    const META_API_BASE = 'https://graph.facebook.com/v21.0';

        // Get all local campaigns with meta_campaign_id
    db.all(
      'SELECT * FROM campaigns WHERE user_id = ? AND meta_campaign_id IS NOT NULL AND archived = 0 ORDER BY created_at DESC',
      [req.user.id],
      async (err, campaigns) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Enrich campaigns with Meta metrics
        const enrichedCampaigns = await Promise.all(
          (campaigns || []).map(async (campaign) => {
            try {
              // Fetch campaign details from Meta (status, start_time, stop_time)
              const campaignResponse = await fetch(
                `${META_API_BASE}/${campaign.meta_campaign_id}?access_token=${accessToken}&fields=id,status,start_time,stop_time`
              );
              const campaignData = await campaignResponse.json();

              // Fetch insights from Meta (spend, purchases, cost_per_purchase, purchase_roas)
              const insightsResponse = await fetch(
                `${META_API_BASE}/${campaign.meta_campaign_id}/insights?access_token=${accessToken}&fields=spend,purchase_roas,actions,action_values&date_preset=last_30d`
              );
              const insightsData = await insightsResponse.json();

              // Parse insights data
              let spend = 0;
              let purchases = 0;
              let costPerPurchase = 0;
              let purchaseRoas = 0;

              if (insightsData.data && insightsData.data.length > 0) {
                const insight = insightsData.data[0];
                spend = parseFloat(insight.spend || 0);
                // purchase_roas is an array: [{action_type, value}]
                if (Array.isArray(insight.purchase_roas) && insight.purchase_roas.length > 0) {
                  purchaseRoas = parseFloat(insight.purchase_roas[0].value || 0);
                } else if (typeof insight.purchase_roas === 'number') {
                  purchaseRoas = insight.purchase_roas;
                }

                // Count purchases from actions array
                if (insight.actions) {
                  for (const action of insight.actions) {
                    if (action.action_type === 'omni_purchase') {
                      purchases += parseInt(action.value || 0);
                    }
                  }
                }

                // Calculate cost per purchase
                if (purchases > 0) {
                  costPerPurchase = spend / purchases;
                }
              }

              return {
                ...campaign,
                meta_status: campaignData.status || null,
                meta_start_time: campaignData.start_time || null,
                meta_stop_time: campaignData.stop_time || null,
                metrics: {
                  spend: spend.toFixed(2),
                  purchases,
                  costPerPurchase: costPerPurchase.toFixed(2),
                  purchaseRoas: purchaseRoas.toFixed(2)
                }
              };
            } catch (error) {
              console.error(`Error fetching metrics for campaign ${campaign.meta_campaign_id}:`, error);
              // Return campaign without metrics if there's an error
              return {
                ...campaign,
                metrics: null,
                meta_error: error.message
              };
            }
          })
        );

        res.json(enrichedCampaigns);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
