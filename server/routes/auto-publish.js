import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

// ============================================================
// HELPERS
// ============================================================

function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
}

// Get user's Meta access token from meta_connections table or fallback to users table
function getUserMetaAccessToken(userId) {
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

function getDriveConfig(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM drive_config WHERE user_id = ?', [userId], (err, config) => {
      if (err) reject(err);
      else resolve(config);
    });
  });
}

function getProductPresets(userId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM product_presets WHERE user_id = ? ORDER BY name ASC', [userId], (err, products) => {
      if (err) reject(err);
      else resolve(products || []);
    });
  });
}

function getSettings(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM settings WHERE user_id = ?', [userId], (err, s) => {
      if (err) reject(err);
      else resolve(s || {
        naming_template: '{producto} {fecha} [CBO Testeo {tipo}]',
        campaign_hour: 5,
        default_budget: 40,
        start_day_offset: 1
      });
    });
  });
}

function getPublishedFolderIds(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT folder_id FROM auto_publish_log WHERE user_id = ? AND status IN ('published', 'pending')",
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []).map(r => r.folder_id));
      }
    );
  });
}

function dbRun(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// GOOGLE DRIVE — Scan folders
// ============================================================

async function driveListFiles(folderId, driveToken) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `${DRIVE_API_BASE}/files?q=${q}&fields=files(id,name,mimeType,webContentLink,thumbnailLink,size)&pageSize=100&orderBy=name`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${driveToken}` }
  });
  const data = await res.json();
  if (data.error) throw new Error(`Drive API: ${data.error.message}`);
  return data.files || [];
}

// Get a direct download URL for a Drive file
function driveDownloadUrl(fileId) {
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
}

// Get a publicly accessible thumbnail/preview URL for images
function driveImageUrl(fileId) {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

// Classify file as video or image based on mimeType
function classifyFile(file) {
  const mime = (file.mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

// Detect product from folder name (case-insensitive match against product presets)
function detectProduct(folderName, products) {
  const lower = folderName.toLowerCase();
  for (const p of products) {
    if (lower.includes(p.name.toLowerCase())) return p;
  }
  return null;
}

// Detect creative type from folder name or file contents
function detectType(folderName, files) {
  const lower = folderName.toLowerCase();
  if (lower.includes('video')) return 'Videos';
  if (lower.includes('estatico') || lower.includes('estático')) return 'Estaticos';

  // Auto-detect from files
  const hasVideo = files.some(f => classifyFile(f) === 'video');
  const hasImage = files.some(f => classifyFile(f) === 'image');
  if (hasVideo && !hasImage) return 'Videos';
  if (hasImage && !hasVideo) return 'Estaticos';
  if (hasVideo && hasImage) return 'Mixto';
  return 'Estaticos';
}

// Extract date from folder name (e.g., "25-Mar", "25/3", "25-3")
function extractDateFromName(name) {
  // Try d-M format (e.g., "25-Mar" or "25-3")
  const match = name.match(/(\d{1,2})[-\/](\d{1,2}|[A-Za-z]+)/);
  if (match) {
    const day = parseInt(match[1]);
    let month;
    const monthPart = match[2];
    if (/^\d+$/.test(monthPart)) {
      month = parseInt(monthPart) - 1; // 0-based
    } else {
      const monthNames = {
        ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
        jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
      };
      month = monthNames[monthPart.toLowerCase().substring(0, 3)] ?? new Date().getMonth();
    }
    const year = new Date().getFullYear();
    return new Date(year, month, day);
  }
  return new Date(); // fallback to today
}

// ============================================================
// META API — Campaign creation from scratch
// ============================================================

async function metaApiCall(endpoint, token, method = 'GET', body = null) {
  const url = endpoint.startsWith('http') ? endpoint : `${META_API_BASE}/${endpoint}`;
  const options = { method, headers: {} };

  if (method === 'POST' && body) {
    // Use form-urlencoded for Meta API (more reliable than JSON)
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    }
    params.append('access_token', token);
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = params.toString();
  } else {
    const separator = endpoint.includes('?') ? '&' : '?';
    const finalUrl = `${url}${separator}access_token=${token}`;
    return fetch(finalUrl, options).then(r => r.json());
  }

  const res = await fetch(url, options);
  return res.json();
}

async function createCampaign(accountId, token, { name, objective, dailyBudgetCents, status }) {
  const data = await metaApiCall(`${accountId}/campaigns`, token, 'POST', {
    name,
    objective: objective || 'OUTCOME_SALES',
    daily_budget: String(dailyBudgetCents),
    buying_type: 'AUCTION',
    status: status || 'PAUSED',
    special_ad_categories: '[]',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
  });
  if (data.error) throw new Error(`Campaign creation failed: ${data.error.message}`);
  return data.id;
}

async function createAdset(accountId, token, {
  campaignId, name, pixelId, pixelEvent, startTime,
  optimizationGoal, billingEvent, targeting, attributionSpec, status
}) {
  const data = await metaApiCall(`${accountId}/adsets`, token, 'POST', {
    campaign_id: campaignId,
    name,
    optimization_goal: optimizationGoal || 'OFFSITE_CONVERSIONS',
    billing_event: billingEvent || 'IMPRESSIONS',
    promoted_object: { pixel_id: pixelId, custom_event_type: pixelEvent || 'PURCHASE' },
    targeting: targeting || {
      age_max: 65,
      age_min: 18,
      geo_locations: { countries: ['AR'], location_types: ['home', 'recent'] },
      brand_safety_content_filter_levels: ['FACEBOOK_RELAXED', 'AN_RELAXED'],
      targeting_automation: { advantage_audience: 1 }
    },
    attribution_spec: attributionSpec || [
      { event_type: 'CLICK_THROUGH', window_days: 7 },
      { event_type: 'VIEW_THROUGH', window_days: 1 }
    ],
    start_time: startTime,
    status: status || 'PAUSED'
  });
  if (data.error) throw new Error(`Adset creation failed: ${data.error.message}`);
  return data.id;
}

async function uploadVideo(accountId, token, { fileUrl, title }) {
  const data = await metaApiCall(`${accountId}/advideos`, token, 'POST', {
    file_url: fileUrl,
    title: title || 'Video'
  });
  if (data.error) throw new Error(`Video upload failed: ${data.error.message}`);
  return data.id;
}

async function waitForVideoProcessing(videoId, token, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const data = await metaApiCall(`${videoId}?fields=status,thumbnails`, token);
    const status = data.status?.video_status;
    if (status === 'ready') {
      const thumb = data.thumbnails?.data?.[0]?.uri;
      return thumb || null;
    }
    if (status === 'error') throw new Error('Video processing failed');
    await sleep(5000);
  }
  return null; // timeout, continue without thumbnail
}

async function createVideoCreative(accountId, token, {
  name, videoId, thumbnailUrl, pageId, productLink, message
}) {
  const videoData = {
    video_id: videoId,
    call_to_action: {
      type: 'SHOP_NOW',
      value: { link: productLink }
    }
  };
  if (thumbnailUrl) videoData.image_url = thumbnailUrl;
  if (message) videoData.message = message;

  const data = await metaApiCall(`${accountId}/adcreatives`, token, 'POST', {
    name,
    object_story_spec: {
      page_id: pageId,
      video_data: videoData
    }
  });
  if (data.error) throw new Error(`Video creative failed: ${data.error.message}`);
  return data.id;
}

async function createImageCreative(accountId, token, {
  name, imageUrl, pageId, productLink, message
}) {
  const data = await metaApiCall(`${accountId}/adcreatives`, token, 'POST', {
    name,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        picture: imageUrl,
        link: productLink,
        call_to_action: { type: 'SHOP_NOW', value: { link: productLink } },
        message: message || ''
      }
    }
  });
  if (data.error) throw new Error(`Image creative failed: ${data.error.message}`);
  return data.id;
}

async function createAd(accountId, token, { name, adsetId, creativeId, status }) {
  const data = await metaApiCall(`${accountId}/ads`, token, 'POST', {
    name,
    adset_id: adsetId,
    creative: { creative_id: creativeId },
    status: status || 'PAUSED'
  });
  if (data.error) throw new Error(`Ad creation failed: ${data.error.message}`);
  return data.id;
}

async function activateEntity(entityId, token) {
  const data = await metaApiCall(entityId, token, 'POST', { status: 'ACTIVE' });
  if (data.error) throw new Error(`Activation failed: ${data.error.message}`);
  return data;
}

// ============================================================
// 1. DRIVE CONFIG — Google Drive connection
// ============================================================

// GET /api/auto-publish/drive-config
router.get('/drive-config', authMiddleware, async (req, res) => {
  try {
    const config = await getDriveConfig(req.user.id);
    res.json(config || { enabled: false, parent_folder_id: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auto-publish/drive-config
router.post('/drive-config', authMiddleware, async (req, res) => {
  try {
    const { drive_token, parent_folder_id, parent_folder_name, month_folders, enabled, scan_interval_minutes } = req.body;

    const existing = await getDriveConfig(req.user.id);

    if (existing) {
      await dbRun(
        `UPDATE drive_config SET
          drive_token = COALESCE(?, drive_token),
          parent_folder_id = COALESCE(?, parent_folder_id),
          parent_folder_name = COALESCE(?, parent_folder_name),
          month_folders = COALESCE(?, month_folders),
          enabled = COALESCE(?, enabled),
          scan_interval_minutes = COALESCE(?, scan_interval_minutes),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        [drive_token, parent_folder_id, parent_folder_name,
         month_folders ? JSON.stringify(month_folders) : null,
         enabled, scan_interval_minutes, req.user.id]
      );
    } else {
      await dbRun(
        `INSERT INTO drive_config (user_id, drive_token, parent_folder_id, parent_folder_name, month_folders, enabled, scan_interval_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, drive_token, parent_folder_id || '1ozQ4Kz3QTgRkDJuKYvH5hqiz6WbAg0iV',
         parent_folder_name || 'Campañas Claude Meta ADS',
         JSON.stringify(month_folders || {}),
         enabled ?? 1, scan_interval_minutes || 120]
      );
    }

    const updated = await getDriveConfig(req.user.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auto-publish/drive-config/test — Test Drive token
router.post('/drive-config/test', authMiddleware, async (req, res) => {
  try {
    const { drive_token } = req.body;
    if (!drive_token) return res.status(400).json({ error: 'drive_token requerido' });

    const files = await driveListFiles('root', drive_token);
    res.json({ success: true, message: `Token valido. Se encontraron ${files.length} archivos en la raiz.` });
  } catch (error) {
    res.status(400).json({ error: `Token invalido: ${error.message}` });
  }
});

// ============================================================
// 2. SCAN — Scan Drive for new folders
// ============================================================

// GET /api/auto-publish/scan
router.get('/scan', authMiddleware, async (req, res) => {
  try {
    const user = await getUser(req.user.id);
    const driveConfig = await getDriveConfig(req.user.id);
    const products = await getProductPresets(req.user.id);
    const publishedIds = await getPublishedFolderIds(req.user.id);

    if (!driveConfig?.drive_token) {
      return res.status(400).json({ error: 'Google Drive no configurado. Agrega un token primero.' });
    }

    const driveToken = driveConfig.drive_token;
    let monthFolders = {};
    try { monthFolders = JSON.parse(driveConfig.month_folders || '{}'); } catch (e) {}

    const results = [];

    // Scan each month folder
    const monthFolderEntries = Object.entries(monthFolders);

    // If no month folders configured, scan parent directly
    const foldersToScan = monthFolderEntries.length > 0
      ? monthFolderEntries.map(([name, id]) => ({ name, id }))
      : [{ name: 'root', id: driveConfig.parent_folder_id }];

    for (const monthFolder of foldersToScan) {
      // List date folders inside month folder
      const dateFolders = await driveListFiles(monthFolder.id, driveToken);

      for (const dateFolder of dateFolders) {
        if (dateFolder.mimeType !== 'application/vnd.google-apps.folder') continue;

        // List product folders inside date folder
        const productFolders = await driveListFiles(dateFolder.id, driveToken);

        for (const productFolder of productFolders) {
          if (productFolder.mimeType !== 'application/vnd.google-apps.folder') continue;

          // Check if already published
          const isPublished = publishedIds.includes(productFolder.id);

          // List creative files
          const files = await driveListFiles(productFolder.id, driveToken);
          const creativeFiles = files.filter(f => classifyFile(f) !== null);

          if (creativeFiles.length === 0) continue;

          // Detect product and type
          const product = detectProduct(productFolder.name, products);
          const creativeType = detectType(productFolder.name, creativeFiles);
          const folderDate = extractDateFromName(dateFolder.name);

          results.push({
            folder_id: productFolder.id,
            folder_name: productFolder.name,
            date_folder_name: dateFolder.name,
            month_folder_name: monthFolder.name,
            folder_date: folderDate.toISOString(),
            product: product ? { id: product.id, name: product.name, link: product.product_link } : null,
            creative_type: creativeType,
            files_count: creativeFiles.length,
            files: creativeFiles.map(f => ({
              id: f.id,
              name: f.name,
              type: classifyFile(f),
              mimeType: f.mimeType,
              size: f.size
            })),
            status: isPublished ? 'published' : 'pending',
            full_path: `${monthFolder.name}/${dateFolder.name}/${productFolder.name}`
          });
        }
      }
    }

    res.json({
      folders: results,
      total: results.length,
      pending: results.filter(r => r.status === 'pending').length,
      published: results.filter(r => r.status === 'published').length,
      scanned_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 3. PUBLISH — Create campaigns from Drive folders
// ============================================================

// POST /api/auto-publish/publish
router.post('/publish', authMiddleware, async (req, res) => {
  try {
    const { folder_ids, activate } = req.body; // array of folder IDs to publish

    if (!folder_ids || folder_ids.length === 0) {
      return res.status(400).json({ error: 'folder_ids requerido (array de IDs)' });
    }

    const metaToken = await getUserMetaAccessToken(req.user.id);
    if (!metaToken) {
      return res.status(401).json({ error: 'Meta no conectado. Conecta tu cuenta primero.' });
    }

    const driveConfig = await getDriveConfig(req.user.id);
    if (!driveConfig?.drive_token) {
      return res.status(400).json({ error: 'Google Drive no configurado.' });
    }

    const user = await getUser(req.user.id);
    const products = await getProductPresets(req.user.id);
    const settings = await getSettings(req.user.id);
    const driveToken = driveConfig.drive_token;

    // Determine ad account — use first product's ad_account_id or user's first connected account
    let adAccounts = [];
    try { adAccounts = JSON.parse(user.meta_ad_accounts || '[]'); } catch (e) {}
    const defaultAccountId = products[0]?.ad_account_id || adAccounts[0]?.id || null;

    if (!defaultAccountId) {
      return res.status(400).json({ error: 'No hay cuenta publicitaria configurada.' });
    }

    const accountId = defaultAccountId.startsWith('act_') ? defaultAccountId : `act_${defaultAccountId}`;

    // Default config
    const PAGE_ID = '978241678702553';
    const PIXEL_ID = '2470190366676204';
    const PIXEL_EVENT = 'PURCHASE';
    const DAILY_BUDGET_CENTS = Math.round((settings.default_budget || 40) * 100);

    const results = [];

    for (const folderId of folder_ids) {
      const logEntry = {
        folder_id: folderId,
        status: 'pending',
        steps: []
      };

      try {
        // Get files in folder
        const files = await driveListFiles(folderId, driveToken);
        const creativeFiles = files.filter(f => classifyFile(f) !== null);

        if (creativeFiles.length === 0) {
          logEntry.status = 'error';
          logEntry.error = 'No hay archivos creativos en la carpeta';
          results.push(logEntry);
          continue;
        }

        // Detect info from folder name — we need the parent path
        // For now, detect product from files' parent folder name
        const folderInfo = await fetch(
          `${DRIVE_API_BASE}/files/${folderId}?fields=name,parents&access_token=${driveToken}`
        ).then(r => r.json());

        const folderName = folderInfo.name || '';
        const product = detectProduct(folderName, products);
        const creativeType = detectType(folderName, creativeFiles);
        const productName = product?.name || folderName;
        const productLink = product?.product_link || 'https://cellu-arg.com';

        // Get date from parent folder name
        let campaignDate = new Date();
        if (folderInfo.parents?.[0]) {
          const parentInfo = await fetch(
            `${DRIVE_API_BASE}/files/${folderInfo.parents[0]}?fields=name&access_token=${driveToken}`
          ).then(r => r.json());
          campaignDate = extractDateFromName(parentInfo.name || '');
        }

        const dateStr = `${campaignDate.getDate()}/${campaignDate.getMonth() + 1}`;

        // Build campaign name from template
        const campaignName = (settings.naming_template || '{producto} {fecha} [CBO Testeo {tipo}]')
          .replace('{producto}', productName)
          .replace('{fecha}', dateStr)
          .replace('{tipo}', creativeType);

        logEntry.campaign_name = campaignName;
        logEntry.product = productName;
        logEntry.creative_type = creativeType;

        // Insert log entry as pending
        const logResult = await dbRun(
          `INSERT INTO auto_publish_log (user_id, folder_id, folder_name, product, creative_type, campaign_name, status)
           VALUES (?, ?, ?, ?, ?, ?, 'publishing')`,
          [req.user.id, folderId, folderName, productName, creativeType, campaignName]
        );
        const logId = logResult.lastID;

        // ── STEP 1: Create campaign ──
        const campaignId = await createCampaign(accountId, metaToken, {
          name: campaignName,
          objective: 'OUTCOME_SALES',
          dailyBudgetCents: DAILY_BUDGET_CENTS,
          status: 'PAUSED'
        });
        logEntry.steps.push({ step: 'campaign', id: campaignId });
        await sleep(1000);

        // ── STEP 2: Create adset ──
        const startDate = new Date(campaignDate);
        startDate.setDate(startDate.getDate() + (settings.start_day_offset || 1));
        startDate.setHours(settings.campaign_hour || 5, 0, 0, 0);
        const startTimeStr = startDate.toISOString().replace('.000Z', '-0300');

        const adsetName = `CBO ${creativeType} - ${productName}`;
        const adsetId = await createAdset(accountId, metaToken, {
          campaignId,
          name: adsetName,
          pixelId: PIXEL_ID,
          pixelEvent: PIXEL_EVENT,
          startTime: startTimeStr,
          status: 'PAUSED'
        });
        logEntry.steps.push({ step: 'adset', id: adsetId });
        await sleep(1000);

        // ── STEP 3: Create creatives + ads for each file ──
        let adsCreated = 0;
        const videos = creativeFiles.filter(f => classifyFile(f) === 'video');
        const images = creativeFiles.filter(f => classifyFile(f) === 'image');

        // Process videos
        for (const file of videos) {
          try {
            const fileUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${driveToken}`;
            const videoId = await uploadVideo(accountId, metaToken, {
              fileUrl,
              title: file.name
            });
            await sleep(2000);

            // Wait for processing
            const thumbnailUrl = await waitForVideoProcessing(videoId, metaToken, 60000);
            // Fallback thumbnail: use an image from the same folder if available
            const fallbackThumb = images.length > 0 ? driveImageUrl(images[0].id) : null;

            const creativeId = await createVideoCreative(accountId, metaToken, {
              name: `${productName} - ${file.name}`,
              videoId,
              thumbnailUrl: thumbnailUrl || fallbackThumb,
              pageId: PAGE_ID,
              productLink
            });
            await sleep(1000);

            const adName = `${productName} - ${file.name}`;
            await createAd(accountId, metaToken, {
              name: adName,
              adsetId,
              creativeId,
              status: 'PAUSED'
            });
            adsCreated++;
            await sleep(1000);
          } catch (err) {
            console.error(`Error processing video ${file.name}:`, err.message);
            logEntry.steps.push({ step: 'error', file: file.name, error: err.message });
          }
        }

        // Process images
        for (const file of images) {
          try {
            const imageUrl = driveImageUrl(file.id);
            const creativeId = await createImageCreative(accountId, metaToken, {
              name: `${productName} - ${file.name}`,
              imageUrl,
              pageId: PAGE_ID,
              productLink
            });
            await sleep(1000);

            const adName = `${productName} - ${file.name}`;
            await createAd(accountId, metaToken, {
              name: adName,
              adsetId,
              creativeId,
              status: 'PAUSED'
            });
            adsCreated++;
            await sleep(1000);
          } catch (err) {
            console.error(`Error processing image ${file.name}:`, err.message);
            logEntry.steps.push({ step: 'error', file: file.name, error: err.message });
          }
        }

        logEntry.steps.push({ step: 'ads_created', count: adsCreated });

        // ── STEP 4: Activate if requested ──
        if (activate && adsCreated > 0) {
          try {
            // Get all ads in the adset and activate them
            const adsData = await metaApiCall(`${adsetId}/ads?fields=id`, metaToken);
            for (const ad of (adsData.data || [])) {
              await activateEntity(ad.id, metaToken);
              await sleep(500);
            }
            await activateEntity(adsetId, metaToken);
            await activateEntity(campaignId, metaToken);
            logEntry.steps.push({ step: 'activated' });
          } catch (err) {
            logEntry.steps.push({ step: 'activation_error', error: err.message });
          }
        }

        // Update log entry
        logEntry.status = 'published';
        logEntry.meta_campaign_id = campaignId;
        logEntry.meta_adset_id = adsetId;
        logEntry.ads_count = adsCreated;

        await dbRun(
          `UPDATE auto_publish_log SET
            status = 'published',
            meta_campaign_id = ?,
            meta_adset_id = ?,
            ads_count = ?
          WHERE id = ?`,
          [campaignId, adsetId, adsCreated, logId]
        );

      } catch (error) {
        logEntry.status = 'error';
        logEntry.error = error.message;
        console.error(`Error publishing folder ${folderId}:`, error);

        // Update log with error
        await dbRun(
          `UPDATE auto_publish_log SET status = 'error', error_message = ? WHERE folder_id = ? AND user_id = ?`,
          [error.message, folderId, req.user.id]
        ).catch(() => {});
      }

      results.push(logEntry);
    }

    res.json({
      results,
      total: results.length,
      published: results.filter(r => r.status === 'published').length,
      errors: results.filter(r => r.status === 'error').length
    });

  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 4. HISTORY — Publishing log
// ============================================================

// GET /api/auto-publish/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const logs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM auto_publish_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
        [req.user.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/auto-publish/history/:id — Remove log entry (allow re-publish)
router.delete('/history/:id', authMiddleware, async (req, res) => {
  try {
    await dbRun(
      'DELETE FROM auto_publish_log WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Entrada eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
