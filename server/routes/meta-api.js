import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Configure multer for file uploads
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

// ============================================================
// META MARKETING API INTEGRATION FOR ADPILOT
// App ID: 2410906072710296
// Permisos: ads_management, ads_read, business_management
// ============================================================

const META_APP_ID = process.env.META_APP_ID || '2410906072710296';
const META_APP_SECRET = process.env.META_APP_SECRET || 'e8f16c8dc84f4e5367e9a3b855dcd133';
const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3001/api/meta/callback';
const META_CONFIG_ID = process.env.META_CONFIG_ID || ''; // Vacío = usar OAuth clásico (sin config_id)

// Debug: verificar que las variables se cargaron
console.log('[META CONFIG] APP_ID:', META_APP_ID);
console.log('[META CONFIG] APP_SECRET loaded:', META_APP_SECRET ? `${META_APP_SECRET.substring(0, 4)}...${META_APP_SECRET.substring(META_APP_SECRET.length - 4)} (${META_APP_SECRET.length} chars)` : 'EMPTY!');
console.log('[META CONFIG] REDIRECT_URI:', REDIRECT_URI);
console.log('[META CONFIG] CONFIG_ID:', META_CONFIG_ID);

// ============================================================
// 1. OAUTH FLOW — Conectar cuenta de Meta del cliente
// ============================================================

// GET /api/meta/auth — Genera URL de autorización OAuth
router.get('/auth', authMiddleware, (req, res) => {
  const state = Buffer.from(JSON.stringify({
    userId: req.user.id,
    timestamp: Date.now()
  })).toString('base64');

  // Permisos necesarios para gestionar campañas
  const scopes = 'ads_management,ads_read,business_management,pages_read_engagement';

  let authUrl;
  if (META_CONFIG_ID) {
    // Facebook Login for Business con config_id (preferido si está configurado)
    authUrl = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&config_id=${META_CONFIG_ID}` +
      `&state=${state}` +
      `&response_type=code` +
      `&override_default_response_type=true`;
  } else {
    // OAuth clásico (fallback)
    authUrl = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${scopes}` +
      `&state=${state}` +
      `&response_type=code`;
  }

  console.log('[OAUTH] Auth URL generada, redirect_uri:', REDIRECT_URI);
  res.json({ authUrl });
});

// GET /api/meta/callback — Callback de OAuth (intercambia code por token)
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Faltan parámetros de autorización');
  }

  try {
    // Decodificar state para obtener userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    // Intercambiar code por access_token
    console.log('[OAUTH CALLBACK] Intercambiando code por token...');
    console.log('[OAUTH CALLBACK] APP_ID:', META_APP_ID);
    console.log('[OAUTH CALLBACK] APP_SECRET:', META_APP_SECRET ? `${META_APP_SECRET.substring(0, 4)}...${META_APP_SECRET.substring(META_APP_SECRET.length - 4)} (${META_APP_SECRET.length} chars)` : 'EMPTY!');
    console.log('[OAUTH CALLBACK] REDIRECT_URI:', REDIRECT_URI);
    console.log('[OAUTH CALLBACK] Code:', code.substring(0, 20) + '...');

    const tokenUrl = `${META_API_BASE}/oauth/access_token?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    console.log('[OAUTH CALLBACK] Token response:', JSON.stringify(tokenData).substring(0, 200));

    if (tokenData.error) {
      console.error('[OAUTH CALLBACK] Error:', JSON.stringify(tokenData.error));
      return res.status(400).json({ error: tokenData.error.message });
    }

    const shortLivedToken = tokenData.access_token;

    // Intercambiar por token de larga duración (60 días)
    const longTokenUrl = `${META_API_BASE}/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`;

    const longTokenResponse = await fetch(longTokenUrl);
    const longTokenData = await longTokenResponse.json();

    const accessToken = longTokenData.access_token || shortLivedToken;
    const expiresIn = longTokenData.expires_in || 5184000; // 60 días default

    // Obtener info del usuario de Meta
    const meResponse = await fetch(`${META_API_BASE}/me?access_token=${accessToken}&fields=id,name`);
    const meData = await meResponse.json();

    // Obtener cuentas publicitarias del usuario
    const adAccountsResponse = await fetch(
      `${META_API_BASE}/me/adaccounts?access_token=${accessToken}&fields=id,name,account_id,currency,timezone_name`
    );
    const adAccountsData = await adAccountsResponse.json();

    // Guardar token y datos en DB (nueva tabla meta_connections)
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Guardar en meta_connections
    db.run(
      `INSERT INTO meta_connections (user_id, access_token, token_type, expires_at, fb_user_id, fb_user_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [userId, accessToken, 'long_lived', expiresAt, meData.id, meData.name],
      function (err) {
        if (err) {
          console.error('[OAUTH CALLBACK] Error saving to meta_connections:', err);
          return res.status(500).json({ error: 'Error al guardar conexión de Meta' });
        }

        // También actualizar users tabla para backwards compatibility
        db.run(
          `UPDATE users SET
            meta_connected = 1,
            meta_access_token = ?,
            meta_token_expires = ?,
            meta_user_id = ?,
            meta_user_name = ?,
            meta_ad_accounts = ?
          WHERE id = ?`,
          [
            accessToken,
            expiresAt,
            meData.id,
            meData.name,
            JSON.stringify(adAccountsData.data || []),
            userId
          ],
          (err) => {
            if (err) {
              console.warn('[OAUTH CALLBACK] Warning: Could not update users table:', err);
            }

            // Redirigir al dashboard con éxito
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/integration?meta_connected=true`);
          }
        );
      }
    );

  } catch (error) {
    console.error('Error en OAuth callback:', error);
    res.status(500).json({ error: 'Error al conectar con Meta' });
  }
});

// GET /api/meta/status — Estado de conexión
router.get('/status', authMiddleware, async (req, res) => {
  try {
    // Try to get from meta_connections first (new approach)
    const connection = await getUserMetaConnection(req.user.id);

    if (connection) {
      // Fetch ad accounts from Meta API in real-time
      let adAccounts = [];
      try {
        const adAccountsResponse = await fetch(
          `${META_API_BASE}/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_id,currency,timezone_name`
        );
        const adAccountsData = await adAccountsResponse.json();
        adAccounts = adAccountsData.data || [];
        console.log('[META STATUS] Ad accounts fetched:', adAccounts.length);
      } catch (e) {
        console.warn('[META STATUS] Could not fetch ad accounts:', e.message);
      }

      res.json({
        connected: true,
        userName: connection.fb_user_name || null,
        adAccounts,
        tokenExpires: connection.expires_at || null
      });
      return;
    }

    // Fallback to users table for backwards compatibility
    db.get(
      `SELECT meta_connected, meta_user_name, meta_ad_accounts, meta_token_expires
       FROM users WHERE id = ?`,
      [req.user.id],
      (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        const connected = Boolean(user?.meta_connected);
        let adAccounts = [];
        try {
          adAccounts = user?.meta_ad_accounts ? JSON.parse(user.meta_ad_accounts) : [];
        } catch (e) { /* ignore */ }

        res.json({
          connected,
          userName: user?.meta_user_name || null,
          adAccounts,
          tokenExpires: user?.meta_token_expires || null
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/meta/campaign-defaults — Obtener defaults para crear campaña nueva
router.get('/campaign-defaults', authMiddleware, async (req, res) => {
  try {
    // Por ahora, retornar defaults sensatos
    // En el futuro, se puede consultar Meta API para obtener settings más personalizados
    res.json({
      cta: 'SHOP_NOW',
      objective: 'OUTCOME_SALES',
      body: '',
      title: '',
      description: ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meta/manual-token — Guardar token manualmente (desde Graph API Explorer)
router.post('/manual-token', authMiddleware, async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ error: 'access_token es requerido' });
    }

    // Verificar que el token sea válido consultando /me
    const meResponse = await fetch(`${META_API_BASE}/me?access_token=${access_token}&fields=id,name`);
    const meData = await meResponse.json();

    if (meData.error) {
      return res.status(400).json({ error: `Token inválido: ${meData.error.message}` });
    }

    // Obtener cuentas publicitarias
    const adAccountsResponse = await fetch(
      `${META_API_BASE}/me/adaccounts?access_token=${access_token}&fields=id,name,account_id,currency,timezone_name`
    );
    const adAccountsData = await adAccountsResponse.json();

    // Intentar extender a token de larga duración
    let finalToken = access_token;
    let expiresIn = 5184000; // 60 días default
    try {
      const longTokenUrl = `${META_API_BASE}/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${access_token}`;
      const longTokenRes = await fetch(longTokenUrl);
      const longTokenData = await longTokenRes.json();
      if (longTokenData.access_token) {
        finalToken = longTokenData.access_token;
        expiresIn = longTokenData.expires_in || 5184000;
      }
    } catch (e) {
      // Si falla la extensión, usamos el token original
      console.log('No se pudo extender token, usando original');
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Guardar en meta_connections
    db.run(
      `INSERT INTO meta_connections (user_id, access_token, token_type, expires_at, fb_user_id, fb_user_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [req.user.id, finalToken, 'long_lived', expiresAt, meData.id, meData.name],
      function (err) {
        if (err) {
          console.error('[MANUAL TOKEN] Error saving to meta_connections:', err);
          return res.status(500).json({ error: 'Error al guardar token en base de datos' });
        }

        // También actualizar users tabla para backwards compatibility
        db.run(
          `UPDATE users SET
            meta_connected = 1,
            meta_access_token = ?,
            meta_token_expires = ?,
            meta_user_id = ?,
            meta_user_name = ?,
            meta_ad_accounts = ?
          WHERE id = ?`,
          [
            finalToken,
            expiresAt,
            meData.id,
            meData.name,
            JSON.stringify(adAccountsData.data || []),
            req.user.id
          ],
          (err) => {
            if (err) {
              console.warn('[MANUAL TOKEN] Warning: Could not update users table:', err);
            }

            res.json({
              success: true,
              userName: meData.name,
              adAccounts: adAccountsData.data || [],
              tokenExpires: expiresAt,
              message: 'Token guardado exitosamente'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error guardando token manual:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/meta/disconnect — Desconectar cuenta
router.delete('/disconnect', authMiddleware, (req, res) => {
  // Delete from meta_connections
  db.run(
    `DELETE FROM meta_connections WHERE user_id = ?`,
    [req.user.id],
    (err) => {
      if (err) {
        console.error('[DISCONNECT] Error deleting from meta_connections:', err);
        return res.status(500).json({ error: err.message });
      }

      // Also clean up users table for backwards compatibility
      db.run(
        `UPDATE users SET
          meta_connected = 0,
          meta_access_token = NULL,
          meta_token_expires = NULL,
          meta_user_id = NULL,
          meta_user_name = NULL,
          meta_ad_accounts = NULL
        WHERE id = ?`,
        [req.user.id],
        (err) => {
          if (err) {
            console.warn('[DISCONNECT] Warning: Could not update users table:', err);
          }
          res.json({ message: 'Cuenta de Meta desconectada' });
        }
      );
    }
  );
});

// ============================================================
// 2. CUENTAS PUBLICITARIAS
// ============================================================

// GET /api/meta/ad-accounts — Listar cuentas publicitarias
router.get('/ad-accounts', authMiddleware, async (req, res) => {
  try {
    // Try meta_connections first (new approach)
    let connection = await getUserMetaConnection(req.user.id);

    // Fallback to users table
    if (!connection) {
      const user = await getUser(req.user.id);
      if (!user?.meta_access_token) {
        return res.status(401).json({ error: 'Meta no conectado' });
      }
      // Create a connection-like object for compatibility
      connection = { access_token: user.meta_access_token };
    }

    const response = await fetch(
      `${META_API_BASE}/me/adaccounts?access_token=${connection.access_token}` +
      `&fields=id,name,account_id,currency,timezone_name,account_status`
    );
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 3. CAMPAÑAS — CRUD vía Marketing API
// ============================================================

// GET /api/meta/campaigns — Listar campañas de una cuenta
router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    // Try meta_connections first (new approach)
    let connection = await getUserMetaConnection(req.user.id);

    // Fallback to users table
    if (!connection) {
      const user = await getUser(req.user.id);
      if (!user?.meta_access_token) {
        return res.status(401).json({ error: 'Meta no conectado' });
      }
      // Create a connection-like object for compatibility
      connection = { access_token: user.meta_access_token };
    }

    const { ad_account_id } = req.query;
    if (!ad_account_id) {
      return res.status(400).json({ error: 'ad_account_id requerido' });
    }

    const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;

    const response = await fetch(
      `${META_API_BASE}/${accountId}/campaigns?access_token=${connection.access_token}` +
      `&fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time` +
      `&limit=50`
    );
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    // Return as { campaigns: [...] } so frontend can use res.data.campaigns
    res.json({ campaigns: data.data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meta/campaigns — Crear campaña (duplicar estructura de base)
router.post('/campaigns', authMiddleware, async (req, res) => {
  try {
    // Try meta_connections first (new approach)
    let connection = await getUserMetaConnection(req.user.id);

    // Fallback to users table
    if (!connection) {
      const user = await getUser(req.user.id);
      if (!user?.meta_access_token) {
        return res.status(401).json({ error: 'Meta no conectado' });
      }
      // Create a connection-like object for compatibility
      connection = { access_token: user.meta_access_token };
    }

    const { ad_account_id, name, objective, daily_budget, status, special_ad_categories } = req.body;

    if (!ad_account_id || !name) {
      return res.status(400).json({ error: 'ad_account_id y name son requeridos' });
    }

    const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;

    const campaignData = {
      name,
      objective: objective || 'OUTCOME_SALES',
      status: status || 'PAUSED',
      special_ad_categories: special_ad_categories || '[]',
      daily_budget: daily_budget ? String(Math.round(daily_budget * 100)) : undefined, // En centavos
      access_token: connection.access_token
    };

    // Limpiar undefined
    Object.keys(campaignData).forEach(key =>
      campaignData[key] === undefined && delete campaignData[key]
    );

    const response = await fetch(`${META_API_BASE}/${accountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData)
    });
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ id: data.id, message: 'Campaña creada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meta/campaigns/:id/duplicate — Duplicar campaña existente
router.post('/campaigns/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const { id } = req.params;
    const { new_name, status_option } = req.body;

    const response = await fetch(`${META_API_BASE}/${id}/copies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rename_options: new_name ? JSON.stringify({ rename_suffix: '' }) : undefined,
        status_option: status_option || 'PAUSED',
        access_token: token
      })
    });
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });

    // Si se proporcionó un nuevo nombre, renombrar
    if (new_name && data.copied_campaign_id) {
      await fetch(`${META_API_BASE}/${data.copied_campaign_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: new_name,
          access_token: token
        })
      });
    }

    res.json({
      campaign_id: data.copied_campaign_id,
      message: 'Campaña duplicada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meta/campaigns/:id/status — Activar/pausar campaña
router.post('/campaigns/:id/status', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const { id } = req.params;
    const { status } = req.body; // ACTIVE, PAUSED

    const response = await fetch(`${META_API_BASE}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status || 'ACTIVE',
        access_token: token
      })
    });
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ success: data.success, message: `Campaña ${status === 'ACTIVE' ? 'activada' : 'pausada'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 4. AD SETS (Conjuntos de anuncios)
// ============================================================

// GET /api/meta/campaigns/:id/adsets — Listar adsets de una campaña
router.get('/campaigns/:id/adsets', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const response = await fetch(
      `${META_API_BASE}/${req.params.id}/adsets?access_token=${token}` +
      `&fields=id,name,status,daily_budget,targeting,start_time,end_time`
    );
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 5. ANUNCIOS (Ads) — Gestión de creativos
// ============================================================

// GET /api/meta/adsets/:id/ads — Listar anuncios de un adset
router.get('/adsets/:id/ads', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const response = await fetch(
      `${META_API_BASE}/${req.params.id}/ads?access_token=${token}` +
      `&fields=id,name,status,creative{id,name,thumbnail_url,object_story_spec}`
    );
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json(data.data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meta/ads/:id/update-creative — Actualizar creativo de un anuncio
router.post('/ads/:id/update-creative', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const { ad_account_id, creative_spec } = req.body;
    const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;

    // Crear nuevo creativo
    const creativeResponse = await fetch(`${META_API_BASE}/${accountId}/adcreatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...creative_spec,
        access_token: token
      })
    });
    const creativeData = await creativeResponse.json();

    if (creativeData.error) {
      return res.status(400).json({ error: creativeData.error.message });
    }

    // Asignar nuevo creativo al anuncio
    const updateResponse = await fetch(`${META_API_BASE}/${req.params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creative: JSON.stringify({ creative_id: creativeData.id }),
        access_token: token
      })
    });
    const updateData = await updateResponse.json();

    if (updateData.error) {
      return res.status(400).json({ error: updateData.error.message });
    }

    res.json({
      creative_id: creativeData.id,
      success: true,
      message: 'Creativo actualizado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 6. SUBIDA DE MULTIMEDIA (Videos e Imágenes)
// ============================================================

// POST /api/meta/upload/video — Subir video a cuenta publicitaria
router.post('/upload/video', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const { ad_account_id, video_url, title } = req.body;
    const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;

    // Subir video desde URL (como hacemos con Google Drive)
    const response = await fetch(`${META_API_BASE}/${accountId}/advideos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: video_url,
        title: title || 'Video AdPilot',
        access_token: token
      })
    });
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ video_id: data.id, message: 'Video subido exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meta/upload/image — Subir imagen a cuenta publicitaria
router.post('/upload/image', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const { ad_account_id, image_url, name } = req.body;
    const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;

    const response = await fetch(`${META_API_BASE}/${accountId}/adimages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: image_url,
        name: name || 'Imagen AdPilot',
        access_token: token
      })
    });
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ images: data.images, message: 'Imagen subida exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: Inspeccionar creative spec de la campaña base
router.get('/debug/base-spec/:campaignId', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) return res.status(401).json({ error: 'No token' });
    const campaignId = req.params.campaignId;

    // Read campaign
    const campRes = await fetch(`${META_API_BASE}/${campaignId}?access_token=${token}&fields=name,objective,status,daily_budget,bid_strategy`);
    const campaign = await campRes.json();

    // Read adsets
    const adsetsRes = await fetch(`${META_API_BASE}/${campaignId}/adsets?access_token=${token}&fields=id,name,status,destination_type&limit=10`);
    const adsets = (await adsetsRes.json()).data || [];

    // Read ads from first adset
    let ads = [];
    if (adsets.length > 0) {
      const adsRes = await fetch(`${META_API_BASE}/${adsets[0].id}/ads?access_token=${token}&fields=id,name,creative{id,object_story_spec,url_tags}&limit=5`);
      ads = (await adsRes.json()).data || [];
    }

    // Extract key fields
    const spec = ads[0]?.creative?.object_story_spec || null;
    const linkData = spec?.link_data || null;
    const videoData = spec?.video_data || null;

    res.json({
      campaign: { id: campaignId, name: campaign.name, objective: campaign.objective },
      adsets_count: adsets.length,
      ads_count: ads.length,
      first_creative_id: ads[0]?.creative?.id || null,
      object_story_spec: spec,
      extracted: {
        page_id: spec?.page_id,
        has_link_data: !!linkData,
        has_video_data: !!videoData,
        link: linkData?.link || videoData?.call_to_action?.value?.link || videoData?.link || null,
        message: (linkData?.message || videoData?.message || videoData?.title || '').substring(0, 100),
        cta_type: (linkData || videoData)?.call_to_action?.type || null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 7. FLUJO COMPLETO — Publicar campaña automáticamente
//    (Replica lo que hacemos por Chrome pero vía API)
// ============================================================

// POST /api/meta/publish — Publicar campaña completa (crea desde cero copiando config de la base)
router.post('/publish', authMiddleware, async (req, res) => {
  try {
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }

    const {
      ad_account_id,
      base_campaign_id,
      campaign_name,
      daily_budget,
      start_time,
      product_link,
      creatives
    } = req.body;

    if (!ad_account_id) {
      return res.status(400).json({ error: 'Falta ad_account_id. Verificá que el producto tenga una cuenta publicitaria asignada.' });
    }
    if (!base_campaign_id) {
      return res.status(400).json({ error: 'Falta base_campaign_id. Verificá que el producto tenga una campaña base configurada.' });
    }
    if (!creatives || creatives.length === 0) {
      return res.status(400).json({ error: 'No se enviaron creativos. Subí al menos una imagen o video.' });
    }

    const accountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;
    var results = { steps: [] }; // var so it's accessible in catch block

    // Helper: llamar a Meta API y lanzar error si falla
    // Helper: esperar N ms
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function metaGet(endpoint, extraParams = '', retries = 3) {
      const sep = endpoint.includes('?') ? '&' : '?';
      const url = `${META_API_BASE}/${endpoint}${sep}access_token=${token}${extraParams ? '&' + extraParams : ''}`;
      for (let attempt = 0; attempt < retries; attempt++) {
        let r;
        try {
          r = await fetch(url);
        } catch (fetchErr) {
          if (attempt < retries - 1) {
            console.warn(`[META GET] Network error en ${endpoint}, reintentando (${attempt + 1}/${retries})...`, fetchErr.message);
            await sleep(3000);
            continue;
          }
          throw new Error(`Error de conexión con Meta API (GET ${endpoint}): ${fetchErr.message}. Verificá tu conexión a internet.`);
        }
        const d = await r.json();
        if (d.error) {
          const isRateLimit = d.error.code === 4 || d.error.code === 17 || d.error.code === 32 ||
            (d.error.message && d.error.message.toLowerCase().includes('limit'));
          if (isRateLimit && attempt < retries - 1) {
            const waitSecs = (attempt + 1) * 10;
            console.warn(`[META GET] Rate limit en ${endpoint}, esperando ${waitSecs}s (intento ${attempt + 1}/${retries})...`);
            await sleep(waitSecs * 1000);
            continue;
          }
          throw new Error(`Meta API GET ${endpoint}: ${d.error.message}`);
        }
        return d;
      }
    }

    async function metaPost(endpoint, body, retries = 3) {
      const fullBody = { ...body, access_token: token };
      console.log(`[META POST] ${endpoint}`, JSON.stringify(fullBody).substring(0, 500));
      for (let attempt = 0; attempt < retries; attempt++) {
        let r;
        try {
          r = await fetch(`${META_API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullBody)
          });
        } catch (fetchErr) {
          if (attempt < retries - 1) {
            console.warn(`[META POST] Network error en ${endpoint}, reintentando (${attempt + 1}/${retries})...`, fetchErr.message);
            await sleep(3000);
            continue;
          }
          throw new Error(`Error de conexión con Meta API (POST ${endpoint}): ${fetchErr.message}. Verificá tu conexión a internet.`);
        }
        const d = await r.json();
        if (d.error) {
          const isRateLimit = d.error.code === 4 || d.error.code === 17 || d.error.code === 32 ||
            (d.error.message && d.error.message.toLowerCase().includes('limit'));
          if (isRateLimit && attempt < retries - 1) {
            const waitSecs = (attempt + 1) * 10;
            console.warn(`[META POST] Rate limit en ${endpoint}, esperando ${waitSecs}s (intento ${attempt + 1}/${retries})...`);
            await sleep(waitSecs * 1000);
            continue;
          }
          console.error(`[META POST ERROR] ${endpoint}:`, JSON.stringify(d.error));
          const userMsg = d.error.error_user_msg || d.error.error_user_title || '';
          const detail = userMsg ? ` — ${userMsg}` : '';
          throw new Error(`Meta API POST ${endpoint}: ${d.error.message}${detail} (code: ${d.error.code}, subcode: ${d.error.error_subcode || 'none'})`);
        }
        return d;
      }
    }

    // =============================================
    // PASO 0: Validar token
    // =============================================
    console.log('[PUBLISH] Validando token...');
    const tokenCheck = await metaGet('me', 'fields=id');
    console.log('[PUBLISH] Token OK, usuario:', tokenCheck.id);
    results.steps.push({ step: 'validate_token', ok: true });

    // =============================================
    // PASO 1: Leer configuración de la campaña base
    // =============================================
    console.log(`[PUBLISH] Leyendo config de campaña base ${base_campaign_id}...`);
    const baseCampaign = await metaGet(
      base_campaign_id,
      'fields=name,objective,special_ad_categories,buying_type,bid_strategy,daily_budget,lifetime_budget,budget_remaining,status,smart_promotion_type'
    );
    console.log('[PUBLISH] Campaña base:', JSON.stringify(baseCampaign));
    results.steps.push({ step: 'read_base_campaign', name: baseCampaign.name });

    // =============================================
    // PASO 2: Leer adsets de la campaña base con TODA su config
    // =============================================
    console.log('[PUBLISH] Leyendo adsets de la campaña base...');
    const baseAdsetsRes = await metaGet(
      `${base_campaign_id}/adsets`,
      'fields=name,status,targeting,optimization_goal,billing_event,bid_amount,bid_strategy,promoted_object,attribution_spec,destination_type,daily_budget,lifetime_budget,start_time,end_time,is_dynamic_creative,pacing_type&limit=100'
    );
    const baseAdsets = baseAdsetsRes.data || [];
    if (baseAdsets.length === 0) {
      throw new Error(`La campaña base "${baseCampaign.name}" no tiene conjuntos de anuncios. Necesita al menos uno.`);
    }
    console.log(`[PUBLISH] Adsets base: ${baseAdsets.length}`);
    results.steps.push({ step: 'read_base_adsets', count: baseAdsets.length });

    // =============================================
    // PASO 3: Leer ads y sus creatives de cada adset base
    // =============================================
    console.log('[PUBLISH] Leyendo ads de adsets base...');
    let baseAds = [];
    for (const adset of baseAdsets) {
      const adsRes = await metaGet(
        `${adset.id}/ads`,
        'fields=id,name,status,creative{id,name,object_story_spec,url_tags,asset_feed_spec},tracking_specs,conversion_specs&limit=100'
      );
      for (const ad of (adsRes.data || [])) {
        baseAds.push({ ...ad, adset_id: adset.id, adset_name: adset.name });
      }
    }
    if (baseAds.length === 0) {
      throw new Error(`La campaña base tiene ${baseAdsets.length} adset(s) pero ningún anuncio. Necesita al menos un anuncio.`);
    }
    console.log(`[PUBLISH] Ads base: ${baseAds.length}`);

    // Guardar spec del primer ad como referencia y extraer campos limpios
    const refAd = baseAds[0];
    const originalStorySpec = refAd.creative?.object_story_spec || null;
    const originalUrlTags = refAd.creative?.url_tags || null;
    const originalAssetFeedSpec = refAd.creative?.asset_feed_spec || null;

    // También intentar obtener el effective_object_story_spec y más campos del creative
    let fullOriginalSpec = originalStorySpec;
    let fullAssetFeedSpec = originalAssetFeedSpec;
    let originalBody = null;
    let originalTitle = null;
    let originalLinkUrl = null;
    let originalDescription = null;
    if (refAd.creative?.id) {
      try {
        const creativeDetail = await metaGet(
          refAd.creative.id,
          'fields=effective_object_story_spec,object_story_spec,asset_feed_spec,body,title,link_url,link_og_id'
        );
        if (creativeDetail.effective_object_story_spec) {
          fullOriginalSpec = creativeDetail.effective_object_story_spec;
          console.log('[PUBLISH] Usando effective_object_story_spec (tiene más campos)');
        }
        if (creativeDetail.asset_feed_spec && !fullAssetFeedSpec) {
          fullAssetFeedSpec = creativeDetail.asset_feed_spec;
        }
        originalBody = creativeDetail.body || null;
        originalTitle = creativeDetail.title || null;
        originalLinkUrl = creativeDetail.link_url || null;
        console.log('[PUBLISH] Creative detail — body:', originalBody?.substring(0, 80));
        console.log('[PUBLISH] Creative detail — title:', originalTitle);
        console.log('[PUBLISH] Creative detail — link_url:', originalLinkUrl);
      } catch (effErr) {
        console.warn('[PUBLISH] No se pudo obtener effective_object_story_spec:', effErr.message);
      }
    }

    // Log asset_feed_spec si existe (contiene los textos para dynamic creative)
    if (fullAssetFeedSpec) {
      console.log('[PUBLISH] ===== ASSET FEED SPEC ORIGINAL =====');
      console.log(JSON.stringify(fullAssetFeedSpec, null, 2).substring(0, 2000));
      console.log('[PUBLISH] =====================================');
    }
    const originalTrackingSpecs = refAd.tracking_specs || null;
    const originalConversionSpecs = refAd.conversion_specs || null;

    // LOG COMPLETO del spec original para diagnóstico
    console.log('[PUBLISH] ===== SPEC ORIGINAL COMPLETO =====');
    console.log(JSON.stringify(originalStorySpec, null, 2));
    console.log('[PUBLISH] ===================================');

    // Extraer campos esenciales de forma limpia (sin campos read-only)
    const origVideoData = originalStorySpec?.video_data || null;
    const origLinkData = originalStorySpec?.link_data || null;
    const origData = origLinkData || origVideoData || {};

    // page_id puede venir como string "123" o como objeto {id:"123"}
    const rawPageId = originalStorySpec?.page_id
      || origLinkData?.page_id
      || origVideoData?.page_id
      || null;
    const extractedPageId = String(
      typeof rawPageId === 'object' && rawPageId?.id
        ? rawPageId.id
        : rawPageId || ''
    );

    const extractedMessage = origData.message || origData.title || '';

    const extractedLink = origLinkData?.link
      || origVideoData?.call_to_action?.value?.link
      || origLinkData?.call_to_action?.value?.link
      || origVideoData?.link
      || product_link  // Fallback: product_link del preset del producto
      || '';

    const extractedCtaType = origData.call_to_action?.type || 'SHOP_NOW';

    // Obtener el instagram_actor_id CORRECTO desde la página de Facebook
    // (instagram_user_id del spec NO es válido como instagram_actor_id)
    let extractedInstagramId = null;
    const specInstagramUserId = originalStorySpec?.instagram_user_id || null;
    const specInstagramActorId = originalStorySpec?.instagram_actor_id || null;

    if (extractedPageId) {
      try {
        // Intentar obtener la cuenta de Instagram Business vinculada a la página
        console.log('[PUBLISH] Buscando Instagram Business Account para la página', extractedPageId);
        const pageIgRes = await metaGet(extractedPageId, 'fields=instagram_business_account');
        if (pageIgRes.instagram_business_account?.id) {
          extractedInstagramId = pageIgRes.instagram_business_account.id;
          console.log(`[PUBLISH] Instagram Business Account encontrada: ${extractedInstagramId}`);
        } else {
          // Intentar obtener cuentas de Instagram vinculadas
          const igAccountsRes = await metaGet(`${extractedPageId}/instagram_accounts`, 'fields=id,username');
          if (igAccountsRes.data?.[0]?.id) {
            extractedInstagramId = igAccountsRes.data[0].id;
            console.log(`[PUBLISH] Instagram Account encontrada via page/instagram_accounts: ${extractedInstagramId}`);
          }
        }
      } catch (igErr) {
        console.warn('[PUBLISH] No se pudo obtener Instagram account de la página:', igErr.message);
      }
    }

    // Si no pudimos obtener desde la página, usar el instagram_actor_id del spec original (si existe)
    if (!extractedInstagramId && specInstagramActorId) {
      extractedInstagramId = specInstagramActorId;
      console.log(`[PUBLISH] Usando instagram_actor_id del spec original: ${extractedInstagramId}`);
    }

    console.log('[PUBLISH] Extraído — page_id:', extractedPageId);
    console.log('[PUBLISH] Extraído — instagram_id:', extractedInstagramId);
    console.log('[PUBLISH] Spec original — instagram_user_id:', specInstagramUserId);
    console.log('[PUBLISH] Spec original — instagram_actor_id:', specInstagramActorId);
    console.log('[PUBLISH] Extraído — message:', extractedMessage?.substring(0, 80));
    console.log('[PUBLISH] Extraído — link:', extractedLink);
    console.log('[PUBLISH] Extraído — link source:', origLinkData?.link ? 'link_data.link' : origVideoData?.call_to_action?.value?.link ? 'video_data.cta' : product_link ? 'product_link preset' : 'NONE');
    console.log('[PUBLISH] Extraído — cta_type:', extractedCtaType);
    console.log('[PUBLISH] product_link recibido:', product_link || '(vacío)');

    if (!extractedPageId || extractedPageId === '' || extractedPageId === 'null' || extractedPageId === 'undefined') {
      throw new Error('No se pudo obtener el page_id de la campaña base. Asegurate de que los anuncios de la campaña base estén asociados a una página de Facebook.');
    }

    // Para campañas de conversión/ventas, un link es obligatorio
    // Si no tenemos link, intentar obtener la URL de la página de Facebook como fallback
    const salesObjectives = ['OUTCOME_SALES', 'CONVERSIONS', 'OUTCOME_TRAFFIC', 'LINK_CLICKS'];
    let finalLink = extractedLink;
    if (!finalLink && extractedPageId) {
      console.log('[PUBLISH] No hay link extraído. Intentando obtener URL de la página de Facebook...');
      try {
        const pageInfo = await metaGet(extractedPageId, 'fields=website,link');
        console.log('[PUBLISH] Info de página:', JSON.stringify(pageInfo));
        if (pageInfo.website) {
          finalLink = pageInfo.website;
          console.log(`[PUBLISH] Usando website de la página como link: ${finalLink}`);
        } else if (pageInfo.link) {
          finalLink = pageInfo.link;
          console.log(`[PUBLISH] Usando link de la página como link: ${finalLink}`);
        }
      } catch (pageErr) {
        console.warn('[PUBLISH] No se pudo obtener info de la página:', pageErr.message);
      }
    }

    if (!finalLink && salesObjectives.includes(baseCampaign.objective)) {
      throw new Error(
        `La campaña base tiene objetivo "${baseCampaign.objective}" que requiere un link de destino, ` +
        `pero no se encontró ningún link. Solución: Editá el producto y agregá el "Link del producto" ` +
        `(ej: https://tutienda.com/producto). Este link se usa como destino del anuncio.`
      );
    }

    results.steps.push({ step: 'read_base_ads', count: baseAds.length, has_spec: !!originalStorySpec, page_id: extractedPageId, link: finalLink || '(none)' });

    // =============================================
    // PASO 4: Crear nueva campaña desde cero
    // =============================================
    console.log('[PUBLISH] Creando nueva campaña...');
    const newCampaignPayload = {
      name: campaign_name,
      objective: baseCampaign.objective || 'OUTCOME_SALES',
      status: 'PAUSED',
      special_ad_categories: baseCampaign.special_ad_categories || [],
    };
    // CBO: budget a nivel campaña
    if (baseCampaign.bid_strategy) {
      newCampaignPayload.bid_strategy = baseCampaign.bid_strategy;
    }
    if (baseCampaign.buying_type && baseCampaign.buying_type !== 'AUCTION') {
      newCampaignPayload.buying_type = baseCampaign.buying_type;
    }
    // Presupuesto a nivel campaña (CBO) - usar el que mandó el usuario
    newCampaignPayload.daily_budget = String(Math.round(daily_budget * 100)); // centavos

    if (baseCampaign.smart_promotion_type) {
      newCampaignPayload.smart_promotion_type = baseCampaign.smart_promotion_type;
    }

    const newCampaign = await metaPost(`${accountId}/campaigns`, newCampaignPayload);
    const newCampaignId = newCampaign.id;
    console.log(`[PUBLISH] Nueva campaña creada: ${newCampaignId}`);
    results.steps.push({ step: 'create_campaign', campaign_id: newCampaignId });

    // =============================================
    // PASO 5: Crear adsets copiando config de los base
    // =============================================
    console.log('[PUBLISH] Creando adsets...');
    const newAdsets = [];
    for (const baseAdset of baseAdsets) {
      const adsetPayload = {
        campaign_id: newCampaignId,
        name: baseAdset.name,
        status: 'PAUSED',
        optimization_goal: baseAdset.optimization_goal,
        billing_event: baseAdset.billing_event || 'IMPRESSIONS',
      };

      // Targeting (obligatorio)
      if (baseAdset.targeting) {
        adsetPayload.targeting = baseAdset.targeting;
      }

      // Promoted object (pixel + evento de conversión)
      if (baseAdset.promoted_object) {
        adsetPayload.promoted_object = baseAdset.promoted_object;
      }

      // Attribution spec
      if (baseAdset.attribution_spec) {
        adsetPayload.attribution_spec = baseAdset.attribution_spec;
      }

      // Destination type
      if (baseAdset.destination_type) {
        adsetPayload.destination_type = baseAdset.destination_type;
      }

      // Bid
      if (baseAdset.bid_amount) {
        adsetPayload.bid_amount = baseAdset.bid_amount;
      }
      if (baseAdset.bid_strategy) {
        adsetPayload.bid_strategy = baseAdset.bid_strategy;
      }

      // NO poner daily_budget en adset si la campaña es CBO (budget a nivel campaña)
      // Solo poner si la base lo tenía explícitamente y la campaña NO es CBO
      if (baseAdset.daily_budget && !baseCampaign.bid_strategy?.includes('LOWEST_COST') && !baseCampaign.daily_budget) {
        adsetPayload.daily_budget = baseAdset.daily_budget;
      }

      // Tiempo de inicio — usar el que mandó el usuario
      if (start_time) {
        adsetPayload.start_time = start_time;
      } else if (baseAdset.start_time) {
        // Usar fecha futura si la base tenía fecha pasada
        const baseStart = new Date(baseAdset.start_time);
        if (baseStart < new Date()) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(5, 0, 0, 0);
          adsetPayload.start_time = tomorrow.toISOString();
        } else {
          adsetPayload.start_time = baseAdset.start_time;
        }
      }

      // Dynamic creative
      if (baseAdset.is_dynamic_creative) {
        adsetPayload.is_dynamic_creative = baseAdset.is_dynamic_creative;
      }

      console.log(`[PUBLISH] Creando adset "${baseAdset.name}"...`);
      try {
        const newAdset = await metaPost(`${accountId}/adsets`, adsetPayload);
        newAdsets.push({ id: newAdset.id, name: baseAdset.name, base_adset_id: baseAdset.id });
        console.log(`[PUBLISH] Adset creado: ${newAdset.id}`);
      } catch (adsetErr) {
        console.error(`[PUBLISH] Error creando adset "${baseAdset.name}":`, adsetErr.message);
        // Intentar sin campos opcionales que pueden causar conflicto
        const minimalPayload = {
          campaign_id: newCampaignId,
          name: baseAdset.name,
          status: 'PAUSED',
          optimization_goal: baseAdset.optimization_goal || 'OFFSITE_CONVERSIONS',
          billing_event: baseAdset.billing_event || 'IMPRESSIONS',
        };
        if (baseAdset.targeting) minimalPayload.targeting = baseAdset.targeting;
        if (baseAdset.promoted_object) minimalPayload.promoted_object = baseAdset.promoted_object;
        if (start_time) minimalPayload.start_time = start_time;

        const retryAdset = await metaPost(`${accountId}/adsets`, minimalPayload);
        newAdsets.push({ id: retryAdset.id, name: baseAdset.name, base_adset_id: baseAdset.id });
        console.log(`[PUBLISH] Adset creado (retry minimal): ${retryAdset.id}`);
      }
    }

    if (newAdsets.length === 0) {
      throw new Error('No se pudo crear ningún conjunto de anuncios. Revisá los permisos y la configuración.');
    }
    results.steps.push({ step: 'create_adsets', count: newAdsets.length });

    // =============================================
    // PASO 6: Subir media y crear ads con creativos nuevos
    // =============================================
    console.log(`[PUBLISH] Subiendo ${creatives.length} creativos y creando ads...`);
    const newAds = [];
    const creativeErrors = [];

    // Helper: limpiar object_story_spec de campos read-only que Meta rechaza al crear
    function cleanSpecForCreate(spec) {
      const cleaned = JSON.parse(JSON.stringify(spec)); // deep clone

      // Remover campos read-only del nivel raíz
      delete cleaned.instagram_user_id; // read-only, usar instagram_actor_id en su lugar

      // page_id puede venir como objeto {id:"123"}, normalizar a string
      if (cleaned.page_id && typeof cleaned.page_id === 'object') {
        cleaned.page_id = String(cleaned.page_id.id || cleaned.page_id);
      } else if (cleaned.page_id) {
        cleaned.page_id = String(cleaned.page_id);
      }

      // Limpiar link_data de campos read-only
      if (cleaned.link_data) {
        delete cleaned.link_data.image_crops; // read-only
        delete cleaned.link_data.multi_share_optimized; // puede causar problemas
        delete cleaned.link_data.multi_share_end_card; // puede causar problemas
        // Limpiar child_attachments si existen
        if (cleaned.link_data.child_attachments) {
          cleaned.link_data.child_attachments.forEach(child => {
            delete child.image_crops;
          });
        }
      }

      // Limpiar video_data de campos read-only
      if (cleaned.video_data) {
        delete cleaned.video_data.image_crops;
        // video_id puede venir como string o como número, asegurar string
        if (cleaned.video_data.video_id) {
          cleaned.video_data.video_id = String(cleaned.video_data.video_id);
        }
      }

      return cleaned;
    }

    // Helper: crear adcreative CLONANDO el spec original y reemplazando solo el media
    async function createAdCreative(name, mediaType, mediaValue, attemptNum) {
      // mediaType: 'image_hash' o 'video_id'
      // mediaValue: el hash o id del media

      const attempts = [];

      // ========================================
      // ESTRATEGIA 0: Si el original usa asset_feed_spec (dynamic creative),
      // usar object_story_spec mínimo + asset_feed_spec con media reemplazado
      // ========================================
      if (fullAssetFeedSpec) {
        // Para dynamic creative, object_story_spec solo necesita page_id + instagram_actor_id
        // Todo el contenido (media, textos, CTAs) va en asset_feed_spec
        const minimalSpec = {
          page_id: extractedPageId,
          ...(extractedInstagramId ? { instagram_actor_id: extractedInstagramId } : {}),
        };
        attempts.push({ label: 'dynamic creative (asset_feed_spec + minimal spec)', spec: minimalSpec, useAssetFeed: true });

        // También intentar con link_data en el spec por si Meta lo necesita como hint
        const hintSpec = {
          page_id: extractedPageId,
          ...(extractedInstagramId ? { instagram_actor_id: extractedInstagramId } : {}),
        };
        if (mediaType === 'image_hash') {
          hintSpec.link_data = {
            image_hash: mediaValue,
            link: finalLink || '',
            call_to_action: { type: extractedCtaType, value: { link: finalLink || '' } },
          };
        } else {
          hintSpec.video_data = {
            video_id: mediaValue,
            ...(finalLink ? { call_to_action: { type: extractedCtaType, value: { link: finalLink } } } : {}),
          };
        }
        attempts.push({ label: 'dynamic creative (asset_feed_spec + media hint)', spec: hintSpec, useAssetFeed: true });
      }

      // ========================================
      // ESTRATEGIA PRINCIPAL: Clonar spec original y solo reemplazar media
      // ========================================
      if (fullOriginalSpec || originalStorySpec) {
        const clonedSpec = cleanSpecForCreate(fullOriginalSpec || originalStorySpec);

        // Agregar instagram_actor_id si lo tenemos (reemplaza el instagram_user_id que eliminamos)
        if (extractedInstagramId) {
          clonedSpec.instagram_actor_id = extractedInstagramId;
        }

        if (mediaType === 'image_hash') {
          // IMAGEN: reemplazar el media en el spec clonado
          if (clonedSpec.video_data) {
            // Original era video, convertir a link_data con imagen
            const videoData = clonedSpec.video_data;
            clonedSpec.link_data = {
              image_hash: mediaValue,
              link: videoData.call_to_action?.value?.link || finalLink || '',
              message: videoData.message || '',
              name: videoData.title || '',
              description: videoData.description || '',
              ...(videoData.call_to_action ? { call_to_action: videoData.call_to_action } : {}),
            };
            delete clonedSpec.video_data;
            attempts.push({ label: 'clone video→image link_data', spec: { ...clonedSpec } });
          } else if (clonedSpec.link_data) {
            // Original era link_data (imagen o video como link ad), reemplazar imagen
            clonedSpec.link_data.image_hash = mediaValue;
            delete clonedSpec.link_data.picture; // remover URL de imagen vieja si existe
            delete clonedSpec.link_data.video_id; // remover video si había
            attempts.push({ label: 'clone link_data con nueva imagen', spec: { ...clonedSpec } });
          } else if (clonedSpec.photo_data) {
            clonedSpec.photo_data.image_hash = mediaValue;
            delete clonedSpec.photo_data.url; // remover URL vieja
            attempts.push({ label: 'clone photo_data con nueva imagen', spec: { ...clonedSpec } });
          } else {
            // No hay data reconocida, crear link_data desde cero con todos los textos extraídos
            clonedSpec.link_data = {
              image_hash: mediaValue,
              link: finalLink || '',
              ...(extractedMessage ? { message: extractedMessage } : {}),
              call_to_action: { type: extractedCtaType, value: { link: finalLink || '' } },
            };
            attempts.push({ label: 'clone spec + nueva link_data imagen', spec: { ...clonedSpec } });
          }
        } else {
          // VIDEO: reemplazar el video_id en el spec clonado
          if (clonedSpec.video_data) {
            // Original era video, reemplazar video_id
            clonedSpec.video_data.video_id = mediaValue;
            delete clonedSpec.video_data.image_url; // el thumbnail se genera automáticamente
            attempts.push({ label: 'clone video_data con nuevo video', spec: { ...clonedSpec } });
          } else if (clonedSpec.link_data) {
            // Original era link ad, convertir a video_data manteniendo textos
            const linkData = clonedSpec.link_data;
            clonedSpec.video_data = {
              video_id: mediaValue,
              title: linkData.name || linkData.caption || '',
              message: linkData.message || '',
              link_description: linkData.description || '',
              ...(linkData.call_to_action ? { call_to_action: linkData.call_to_action } : {}),
            };
            delete clonedSpec.link_data;
            attempts.push({ label: 'clone link_data→video_data', spec: { ...clonedSpec } });
          } else {
            // No hay data reconocida, crear video_data con textos extraídos
            clonedSpec.video_data = {
              video_id: mediaValue,
              title: extractedMessage || name || 'Ad',
              ...(extractedMessage ? { message: extractedMessage } : {}),
              ...(finalLink ? { call_to_action: { type: extractedCtaType, value: { link: finalLink } } } : {}),
            };
            attempts.push({ label: 'clone spec + nuevo video_data', spec: { ...clonedSpec } });
          }
        }
      }

      // ========================================
      // FALLBACK: Si no hay spec original o si el clone falla, intentar desde cero
      // ========================================
      if (mediaType === 'image_hash') {
        if (finalLink) {
          attempts.push({
            label: 'fallback image link_data',
            spec: {
              page_id: extractedPageId,
              ...(extractedInstagramId ? { instagram_actor_id: extractedInstagramId } : {}),
              link_data: {
                image_hash: mediaValue,
                link: finalLink,
                ...(extractedMessage ? { message: extractedMessage } : {}),
                call_to_action: { type: extractedCtaType, value: { link: finalLink } }
              }
            }
          });
        }
        attempts.push({
          label: 'fallback photo_data',
          spec: {
            page_id: extractedPageId,
            ...(extractedInstagramId ? { instagram_actor_id: extractedInstagramId } : {}),
            photo_data: {
              image_hash: mediaValue,
              ...(extractedMessage ? { message: extractedMessage } : {}),
            }
          }
        });
      } else {
        attempts.push({
          label: 'fallback video_data completo',
          spec: {
            page_id: extractedPageId,
            ...(extractedInstagramId ? { instagram_actor_id: extractedInstagramId } : {}),
            video_data: {
              video_id: mediaValue,
              title: extractedMessage || name || 'Ad',
              ...(extractedMessage ? { message: extractedMessage } : {}),
              ...(finalLink ? { call_to_action: { type: extractedCtaType, value: { link: finalLink } } } : {}),
            }
          }
        });
      }

      // Si hay instagram_actor_id, duplicar todos los intentos SIN él como safety net
      if (extractedInstagramId) {
        const withoutInsta = attempts
          .filter(a => a.spec.instagram_actor_id)
          .map(a => {
            const specCopy = JSON.parse(JSON.stringify(a.spec));
            delete specCopy.instagram_actor_id;
            return { label: a.label + ' (sin instagram)', spec: specCopy };
          });
        attempts.push(...withoutInsta);
      }

      // Preparar asset_feed_spec clonado con media reemplazado
      let clonedAssetFeedSpec = null;
      if (fullAssetFeedSpec) {
        try {
          clonedAssetFeedSpec = JSON.parse(JSON.stringify(fullAssetFeedSpec));
          // Reemplazar el media en el asset_feed_spec
          if (mediaType === 'image_hash') {
            // Reemplazar imágenes en el asset feed
            if (clonedAssetFeedSpec.images) {
              clonedAssetFeedSpec.images = [{ hash: mediaValue }];
            }
            // Remover videos si los hay (estamos reemplazando con imagen)
            if (clonedAssetFeedSpec.videos) {
              delete clonedAssetFeedSpec.videos;
              if (!clonedAssetFeedSpec.images) {
                clonedAssetFeedSpec.images = [{ hash: mediaValue }];
              }
            }
          } else {
            // Video: reemplazar video_id en el asset feed
            if (clonedAssetFeedSpec.videos) {
              clonedAssetFeedSpec.videos = [{ video_id: mediaValue }];
            }
            // Remover imágenes si las hay (estamos reemplazando con video)
            if (clonedAssetFeedSpec.images) {
              delete clonedAssetFeedSpec.images;
              if (!clonedAssetFeedSpec.videos) {
                clonedAssetFeedSpec.videos = [{ video_id: mediaValue }];
              }
            }
          }
          // Asegurar que el link_url esté presente
          if (!clonedAssetFeedSpec.link_urls && finalLink) {
            clonedAssetFeedSpec.link_urls = [{ website_url: finalLink }];
          }
          // Asegurar que haya al menos un media
          if (mediaType === 'image_hash' && !clonedAssetFeedSpec.images) {
            clonedAssetFeedSpec.images = [{ hash: mediaValue }];
          }
          if (mediaType === 'video_id' && !clonedAssetFeedSpec.videos) {
            clonedAssetFeedSpec.videos = [{ video_id: mediaValue }];
          }
          // Asegurar ad_formats
          if (!clonedAssetFeedSpec.ad_formats) {
            clonedAssetFeedSpec.ad_formats = ['SINGLE_IMAGE'];
          }
          // Remover campos que pueden causar problemas al re-crear
          delete clonedAssetFeedSpec.optimization_type;
          console.log('[PUBLISH] asset_feed_spec clonado con nuevo media:', JSON.stringify(clonedAssetFeedSpec).substring(0, 500));
        } catch (afsErr) {
          console.warn('[PUBLISH] Error clonando asset_feed_spec:', afsErr.message);
          clonedAssetFeedSpec = null;
        }
      }

      // Probar cada intento
      const errors = [];
      for (const attempt of attempts) {
        try {
          console.log(`[PUBLISH] Creando adcreative (${attempt.label}):`, JSON.stringify(attempt.spec, null, 2));

          // Construir el body del request
          const creativeBody = {
            name: name,
            object_story_spec: attempt.spec,
            ...(originalUrlTags ? { url_tags: originalUrlTags } : {}),
          };

          // Si este intento usa asset_feed_spec (dynamic creative), incluirlo
          // Meta API espera asset_feed_spec como JSON string
          if (attempt.useAssetFeed && clonedAssetFeedSpec) {
            creativeBody.asset_feed_spec = typeof clonedAssetFeedSpec === 'string'
              ? clonedAssetFeedSpec
              : JSON.stringify(clonedAssetFeedSpec);
            console.log('[PUBLISH] Incluyendo asset_feed_spec en el creative (dynamic creative)');
          }

          // Si no usa asset_feed_spec, incluir body/title del creative original directamente
          if (!attempt.useAssetFeed) {
            if (originalBody) creativeBody.body = originalBody;
            if (originalTitle) creativeBody.title = originalTitle;
            if (originalLinkUrl) creativeBody.link_url = originalLinkUrl;
          }

          const result = await metaPost(`${accountId}/adcreatives`, creativeBody);
          console.log(`[PUBLISH] ✅ adcreative creado con "${attempt.label}": ${result.id}`);
          return result.id;
        } catch (err) {
          const shortErr = err.message.replace('Meta API POST ' + accountId + '/adcreatives: ', '');
          errors.push(`${attempt.label}: ${shortErr}`);
          console.log(`[PUBLISH] ❌ Falló "${attempt.label}": ${shortErr}`);
        }
      }

      const allErrors = errors.join(' → ');
      console.error(`[PUBLISH] No se pudo crear adcreative para "${name}": ${allErrors}`);
      creativeErrors.push(`[${name}] ${allErrors}`);
      return null;
    }

    for (let i = 0; i < creatives.length; i++) {
      const creative = creatives[i];
      const adsetForAd = newAdsets.length === 1
        ? newAdsets[0]
        : newAdsets[i % newAdsets.length];

      // Resolver ruta del archivo
      const filename = creative.filename;
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        console.error(`[PUBLISH] Archivo no encontrado: ${filePath}`);
        creativeErrors.push(`[${creative.name}] Archivo no encontrado: ${filename}`);
        continue;
      }

      const fileStats = fs.statSync(filePath);
      console.log(`[PUBLISH] Archivo ${filename}: ${fileStats.size} bytes, tipo: ${creative.type}`);

      let adCreativeId = null;

      if (creative.type === 'video') {
        // Subir video
        const fileBuffer = fs.readFileSync(filePath);
        const vidExt = path.extname(filename).toLowerCase();
        const vidMimeTypes = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.webm': 'video/webm' };
        const vidMimeType = vidMimeTypes[vidExt] || 'video/mp4';
        const fileBlob = new Blob([fileBuffer], { type: vidMimeType });
        const form = new FormData();
        form.append('access_token', token);
        form.append('title', creative.name);
        form.append('source', fileBlob, filename);
        console.log(`[PUBLISH] Video: ${fileBuffer.length} bytes, MIME: ${vidMimeType}, nombre: ${filename}`);

        console.log(`[PUBLISH] Subiendo video ${i + 1}/${creatives.length}: ${filename}`);
        const videoRes = await fetch(`${META_API_BASE}/${accountId}/advideos`, {
          method: 'POST',
          body: form
        });
        const videoData = await videoRes.json();
        if (videoData.error) {
          console.error(`[PUBLISH] Error subiendo video ${i}:`, videoData.error);
          creativeErrors.push(`[${creative.name}] Error subiendo video: ${videoData.error.message || JSON.stringify(videoData.error)}`);
          continue;
        }
        console.log(`[PUBLISH] Video subido: ${videoData.id}`);

        adCreativeId = await createAdCreative(creative.name, 'video_id', videoData.id, i);

      } else {
        // Subir imagen
        const fileBuffer = fs.readFileSync(filePath);
        // Detectar MIME type por extensión
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
        const mimeType = mimeTypes[ext] || 'image/jpeg';
        const fileBlob = new Blob([fileBuffer], { type: mimeType });
        const form = new FormData();
        form.append('access_token', token);
        form.append('filename', creative.name);
        form.append('file', fileBlob, filename);
        console.log(`[PUBLISH] Imagen: ${fileBuffer.length} bytes, MIME: ${mimeType}, nombre: ${filename}`);

        console.log(`[PUBLISH] Subiendo imagen ${i + 1}/${creatives.length}: ${filename}`);
        const imageRes = await fetch(`${META_API_BASE}/${accountId}/adimages`, {
          method: 'POST',
          body: form
        });
        const imageData = await imageRes.json();
        if (imageData.error) {
          console.error(`[PUBLISH] Error subiendo imagen ${i}:`, imageData.error);
          creativeErrors.push(`[${creative.name}] Error subiendo imagen: ${imageData.error.message || JSON.stringify(imageData.error)}`);
          continue;
        }
        const imageHash = Object.values(imageData.images || {})[0]?.hash;
        if (!imageHash) {
          console.error(`[PUBLISH] No se obtuvo image_hash para imagen ${i}:`, JSON.stringify(imageData));
          creativeErrors.push(`[${creative.name}] No se obtuvo image_hash de Meta. Respuesta: ${JSON.stringify(imageData).slice(0, 200)}`);
          continue;
        }
        console.log(`[PUBLISH] Imagen subida, hash: ${imageHash}`);

        adCreativeId = await createAdCreative(creative.name, 'image_hash', imageHash, i);
      }

      // Crear el ad en el adset
      if (adCreativeId) {
        try {
          const adPayload = {
            adset_id: adsetForAd.id,
            name: creative.name,
            status: 'PAUSED',
            creative: { creative_id: adCreativeId },
          };
          // Copiar tracking/conversion specs del ad original si existen
          if (originalTrackingSpecs) adPayload.tracking_specs = originalTrackingSpecs;
          if (originalConversionSpecs) adPayload.conversion_specs = originalConversionSpecs;
          const newAd = await metaPost(`${accountId}/ads`, adPayload);
          newAds.push({ id: newAd.id, adset_id: adsetForAd.id });
          console.log(`[PUBLISH] Ad creado: ${newAd.id}`);
        } catch (adErr) {
          console.error(`[PUBLISH] Error creando ad ${i}:`, adErr.message);
        }
      }
    }

    if (newAds.length === 0) {
      throw new Error(`No se pudo crear ningún anuncio. Errores de cada creativo: ${creativeErrors.join(' | ')}`);
    }
    results.steps.push({ step: 'upload_and_create_ads', count: newAds.length });

    // =============================================
    // PASO 7: Activar todo — ads, adsets y campaña
    // =============================================
    console.log('[PUBLISH] Activando ads...');
    for (const ad of newAds) {
      await metaPost(ad.id, { status: 'ACTIVE' });
    }

    console.log('[PUBLISH] Activando adsets...');
    for (const adset of newAdsets) {
      const update = { status: 'ACTIVE' };
      if (start_time) update.start_time = start_time;
      await metaPost(adset.id, update);
    }

    console.log('[PUBLISH] Activando campaña...');
    const campaignActivate = { status: 'ACTIVE' };
    if (start_time) campaignActivate.start_time = start_time;
    await metaPost(newCampaignId, campaignActivate);

    results.steps.push({ step: 'activate_all', ads: newAds.length, adsets: newAdsets.length });
    results.success = true;
    results.campaign_id = newCampaignId;
    results.campaign_name = campaign_name;

    // Send notifications
    try {
      const notifResult = await sendNotifications(req.user.id, campaign_name, newCampaignId);
      if (notifResult.whatsapp_link) {
        results.whatsapp_link = notifResult.whatsapp_link;
      }
    } catch (notifErr) {
      console.error('[PUBLISH] Error sending notifications:', notifErr.message);
      // Don't fail the publish if notifications fail
    }

    console.log(`[PUBLISH] ✅ Campaña "${campaign_name}" publicada exitosamente! ID: ${newCampaignId}`);
    res.json(results);

  } catch (error) {
    console.error('[PUBLISH] ❌ Error en publicación:', error.message);
    console.error('[PUBLISH] Stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Error desconocido en publicación',
      detail: error.stack ? error.stack.split('\n').slice(0, 3).join(' | ') : null,
      steps: results?.steps || []
    });
  }
});

// ============================================================
// POST /api/meta/publish-new — Crear campaña desde cero (no clonar)
// ============================================================
router.post('/publish-new', authMiddleware, upload.array('files', 100), async (req, res) => {
  const results = { success: false, steps: [], details: [] };

  try {
    // Obtener token
    const token = await getUserMetaAccessToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'Meta no conectado' });
    }
    const rawAccountId = req.body.ad_account_id;

    if (!rawAccountId) {
      return res.status(400).json({ error: 'ad_account_id requerido' });
    }

    // Normalizar account ID con prefijo act_
    const accountId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;

    const {
      campaign_name,
      start_date,
      daily_budget,
      body_text,
      title_text: raw_title_text,
      description_text: raw_description_text,
      cta_type,
      destination_url,
      campaign_objective,
      campaign_hour
    } = req.body;

    // Validar campos requeridos
    if (!campaign_name || !daily_budget || !body_text || !destination_url || !campaign_objective) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: campaign_name, daily_budget, body_text, destination_url, campaign_objective'
      });
    }

    // Parsear title_text y description_text (vienen como JSON arrays desde el frontend)
    let titleTexts = [];
    let descriptionTexts = [];
    try {
      titleTexts = typeof raw_title_text === 'string' ? JSON.parse(raw_title_text) : (raw_title_text || []);
    } catch { titleTexts = raw_title_text ? [raw_title_text] : []; }
    try {
      descriptionTexts = typeof raw_description_text === 'string' ? JSON.parse(raw_description_text) : (raw_description_text || []);
    } catch { descriptionTexts = raw_description_text ? [raw_description_text] : []; }

    // Usar el primer valor para campos que requieren un solo string
    const title_text = titleTexts.length > 0 ? titleTexts[0] : '';
    const description_text = descriptionTexts.length > 0 ? descriptionTexts[0] : '';

    console.log(`[PUBLISH-NEW] Creando campaña "${campaign_name}" en cuenta ${accountId}`);
    console.log(`[PUBLISH-NEW] Titles parsed:`, titleTexts);
    console.log(`[PUBLISH-NEW] Descriptions parsed:`, descriptionTexts);

    // Helper: esperar N ms
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper: POST a Meta API con reintentos
    async function metaPost(endpoint, body, retries = 3) {
      const fullBody = { ...body, access_token: token };
      console.log(`[META POST] ${endpoint}`, JSON.stringify(fullBody).substring(0, 500));
      for (let attempt = 0; attempt < retries; attempt++) {
        let r;
        try {
          r = await fetch(`${META_API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullBody)
          });
        } catch (fetchErr) {
          if (attempt < retries - 1) {
            console.warn(`[META POST] Network error en ${endpoint}, reintentando (${attempt + 1}/${retries})...`, fetchErr.message);
            await sleep(3000);
            continue;
          }
          throw new Error(`Error de conexión con Meta API (POST ${endpoint}): ${fetchErr.message}. Verificá tu conexión a internet.`);
        }
        const d = await r.json();
        if (d.error) {
          const isRateLimit = d.error.code === 4 || d.error.code === 17 || d.error.code === 32 ||
            (d.error.message && d.error.message.toLowerCase().includes('limit'));
          if (isRateLimit && attempt < retries - 1) {
            const waitSecs = (attempt + 1) * 10;
            console.warn(`[META POST] Rate limit en ${endpoint}, esperando ${waitSecs}s (intento ${attempt + 1}/${retries})...`);
            await sleep(waitSecs * 1000);
            continue;
          }
          console.error(`[META POST ERROR] ${endpoint}:`, JSON.stringify(d.error));
          const userMsg = d.error.error_user_msg || d.error.error_user_title || '';
          const detail = userMsg ? ` — ${userMsg}` : '';
          throw new Error(`Meta API POST ${endpoint}: ${d.error.message}${detail} (code: ${d.error.code}, subcode: ${d.error.error_subcode || 'none'})`);
        }
        return d;
      }
    }

    // Calcular start_time con campaign_hour
    let startTimeUnix = null;
    if (start_date) {
      const startDateObj = new Date(start_date);
      const hour = parseInt(campaign_hour) || 0;
      startDateObj.setHours(hour, 0, 0, 0);
      startTimeUnix = Math.floor(startDateObj.getTime() / 1000);
      console.log(`[PUBLISH-NEW] Start time: ${startDateObj.toISOString()} (hour=${hour}, unix=${startTimeUnix})`);
    }

    // =============================================
    // PASO 0: Obtener Page ID del usuario
    // =============================================
    console.log('[PUBLISH-NEW] Obteniendo Facebook Pages del usuario...');
    let userPageId = null;
    try {
      const pagesRes = await fetch(`${META_API_BASE}/me/accounts?access_token=${token}&fields=id,name`);
      const pagesData = await pagesRes.json();
      if (pagesData.data && pagesData.data.length > 0) {
        userPageId = pagesData.data[0].id;
        console.log(`[PUBLISH-NEW] Page ID encontrado: ${userPageId} (${pagesData.data[0].name})`);
      } else {
        // Intentar obtener páginas desde la cuenta publicitaria
        const promotableRes = await fetch(`${META_API_BASE}/${accountId}/promote_pages?access_token=${token}&fields=id,name`);
        const promotableData = await promotableRes.json();
        if (promotableData.data && promotableData.data.length > 0) {
          userPageId = promotableData.data[0].id;
          console.log(`[PUBLISH-NEW] Page ID (promotable): ${userPageId} (${promotableData.data[0].name})`);
        }
      }
    } catch (pageErr) {
      console.error('[PUBLISH-NEW] Error obteniendo pages:', pageErr.message);
    }

    if (!userPageId) {
      throw new Error('No se encontró una página de Facebook asociada a tu cuenta. Necesitás tener al menos una página de Facebook para crear anuncios.');
    }

    // =============================================
    // PASO 1: Crear campaña
    // =============================================
    console.log('[PUBLISH-NEW] Creando campaña...');
    const campaignData = {
      name: campaign_name,
      objective: campaign_objective,
      status: 'PAUSED',
      ...(startTimeUnix ? { start_time: startTimeUnix } : {})
    };

    const newCampaign = await metaPost(`${accountId}/campaigns`, campaignData);
    const newCampaignId = newCampaign.id;
    console.log(`[PUBLISH-NEW] Campaña creada: ${newCampaignId}`);
    results.steps.push({ step: 'create_campaign', campaign_id: newCampaignId, campaign_name });

    // =============================================
    // PASO 2: Crear adset con segmentación predeterminada
    // =============================================
    console.log('[PUBLISH-NEW] Creando adset...');

    // Mapear objetivo de campaña a optimization_goal del adset
    const objectiveToOptimization = {
      'OUTCOME_TRAFFIC': 'LINK_CLICKS',
      'OUTCOME_ENGAGEMENT': 'POST_ENGAGEMENT',
      'OUTCOME_LEADS': 'LEAD_GENERATION',
      'OUTCOME_SALES': 'OFFSITE_CONVERSIONS',
      'OUTCOME_AWARENESS': 'REACH',
      'LINK_CLICKS': 'LINK_CLICKS',
      'CONVERSIONS': 'OFFSITE_CONVERSIONS',
      'REACH': 'REACH',
      'BRAND_AWARENESS': 'AD_RECALL_LIFT',
      'LEAD_GENERATION': 'LEAD_GENERATION',
      'POST_ENGAGEMENT': 'POST_ENGAGEMENT'
    };
    const optimizationGoal = objectiveToOptimization[campaign_objective] || 'LINK_CLICKS';

    const adsetData = {
      campaign_id: newCampaignId,
      name: `${campaign_name} - Adset`,
      optimization_goal: optimizationGoal,
      billing_event: 'IMPRESSIONS',
      daily_budget: Math.floor(parseFloat(daily_budget) * 100), // En centavos
      status: 'PAUSED',
      targeting: {
        geo_locations: {
          countries: ['AR'],
          location_types: ['home', 'recent']
        }
      },
      ...(startTimeUnix ? { start_time: startTimeUnix } : {})
    };

    const newAdset = await metaPost(`${accountId}/adsets`, adsetData);
    const newAdsetId = newAdset.id;
    console.log(`[PUBLISH-NEW] Adset creado: ${newAdsetId}`);
    results.steps.push({ step: 'create_adset', adset_id: newAdsetId });

    // =============================================
    // PASO 3: Subir medios (imágenes/videos)
    // =============================================
    console.log('[PUBLISH-NEW] Subiendo medios...');
    const files = req.files || [];
    const uploadedMedias = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.mimetype.startsWith('video/');

      try {
        if (isVideo) {
          // Subir video
          const fileBuffer = fs.readFileSync(file.path);
          const fileBlob = new Blob([fileBuffer]);
          const form = new FormData();
          form.append('access_token', token);
          form.append('title', file.originalname);
          form.append('source', fileBlob, file.originalname);

          console.log(`[PUBLISH-NEW] Subiendo video ${i + 1}/${files.length}: ${file.originalname}`);
          const videoRes = await fetch(`${META_API_BASE}/${accountId}/advideos`, {
            method: 'POST',
            body: form
          });
          const videoData = await videoRes.json();

          if (videoData.error) {
            console.error(`[PUBLISH-NEW] Error subiendo video:`, videoData.error);
            continue;
          }

          uploadedMedias.push({
            type: 'video',
            id: videoData.id,
            filename: file.originalname
          });
          console.log(`[PUBLISH-NEW] Video subido: ${videoData.id}`);
        } else {
          // Subir imagen
          const fileBuffer = fs.readFileSync(file.path);
          const fileBlob = new Blob([fileBuffer]);
          const form = new FormData();
          form.append('access_token', token);
          form.append('filename', file.originalname);
          form.append('file', fileBlob, file.originalname);

          console.log(`[PUBLISH-NEW] Subiendo imagen ${i + 1}/${files.length}: ${file.originalname}`);
          const imageRes = await fetch(`${META_API_BASE}/${accountId}/adimages`, {
            method: 'POST',
            body: form
          });
          const imageData = await imageRes.json();

          if (imageData.error) {
            console.error(`[PUBLISH-NEW] Error subiendo imagen:`, imageData.error);
            continue;
          }

          const imageHash = Object.values(imageData.images || {})[0]?.hash;
          if (!imageHash) {
            console.error(`[PUBLISH-NEW] No se obtuvo image_hash para imagen`);
            continue;
          }

          uploadedMedias.push({
            type: 'image',
            hash: imageHash,
            filename: file.originalname
          });
          console.log(`[PUBLISH-NEW] Imagen subida, hash: ${imageHash}`);
        }
      } catch (mediaErr) {
        console.error(`[PUBLISH-NEW] Error subiendo medio ${i}:`, mediaErr.message);
      }
    }

    if (uploadedMedias.length === 0) {
      throw new Error('No se pudieron subir medios');
    }
    results.steps.push({ step: 'upload_media', count: uploadedMedias.length });

    // =============================================
    // PASO 4: Crear creatives y ads
    // =============================================
    console.log('[PUBLISH-NEW] Creando creatives y ads...');
    const newAds = [];

    for (const media of uploadedMedias) {
      try {
        let creativeSpec;

        if (media.type === 'video') {
          creativeSpec = {
            page_id: userPageId,
            video_data: {
              video_id: media.id,
              title: title_text || campaign_name,
              message: body_text,
              ...(description_text ? { link_description: description_text } : {}),
              ...(destination_url && cta_type !== 'NO_BUTTON' ? {
                call_to_action: {
                  type: cta_type,
                  value: { link: destination_url }
                }
              } : {})
            }
          };
        } else {
          creativeSpec = {
            page_id: userPageId,
            link_data: {
              image_hash: media.hash,
              link: destination_url,
              message: body_text,
              ...(title_text ? { name: title_text } : {}),
              ...(description_text ? { description: description_text } : {}),
              ...(cta_type !== 'NO_BUTTON' ? {
                call_to_action: {
                  type: cta_type,
                  value: { link: destination_url }
                }
              } : {})
            }
          };
        }

        const creativeBody = {
          name: `${campaign_name} - ${media.filename}`,
          object_story_spec: creativeSpec
        };

        console.log(`[PUBLISH-NEW] Creando creative para ${media.filename}...`);
        const creative = await metaPost(`${accountId}/adcreatives`, creativeBody);
        console.log(`[PUBLISH-NEW] Creative creado: ${creative.id}`);

        // Crear ad
        const adPayload = {
          adset_id: newAdsetId,
          name: `${campaign_name} - ${media.filename}`,
          status: 'PAUSED',
          creative: { creative_id: creative.id }
        };

        const ad = await metaPost(`${accountId}/ads`, adPayload);
        newAds.push({ id: ad.id });
        console.log(`[PUBLISH-NEW] Ad creado: ${ad.id}`);
      } catch (err) {
        console.error(`[PUBLISH-NEW] Error creando creative/ad para ${media.filename}:`, err.message);
      }
    }

    if (newAds.length === 0) {
      throw new Error('No se pudieron crear anuncios');
    }
    results.steps.push({ step: 'create_ads', count: newAds.length });

    // =============================================
    // PASO 5: Activar todo
    // =============================================
    console.log('[PUBLISH-NEW] Activando ads, adsets y campaña...');

    for (const ad of newAds) {
      await metaPost(ad.id, { status: 'ACTIVE' });
    }

    await metaPost(newAdsetId, { status: 'ACTIVE', ...(startTimeUnix ? { start_time: startTimeUnix } : {}) });
    await metaPost(newCampaignId, { status: 'ACTIVE', ...(startTimeUnix ? { start_time: startTimeUnix } : {}) });

    results.steps.push({ step: 'activate_all', ads: newAds.length });
    results.success = true;
    results.campaign_id = newCampaignId;
    results.campaign_name = campaign_name;

    // Enviar notificaciones
    try {
      const notifResult = await sendNotifications(req.user.id, campaign_name, newCampaignId);
      if (notifResult.whatsapp_link) {
        results.whatsapp_link = notifResult.whatsapp_link;
      }
    } catch (notifErr) {
      console.error('[PUBLISH-NEW] Error sending notifications:', notifErr.message);
    }

    console.log(`[PUBLISH-NEW] ✅ Campaña "${campaign_name}" creada exitosamente! ID: ${newCampaignId}`);

    // Limpiar archivos subidos del disco
    cleanupUploadedFiles(req.files);

    res.json(results);

  } catch (error) {
    console.error('[PUBLISH-NEW] ❌ Error:', error.message);

    // Limpiar archivos subidos del disco incluso si hubo error
    cleanupUploadedFiles(req.files);

    res.status(500).json({
      error: error.message || 'Error desconocido',
      steps: results?.steps || []
    });
  }
});

// ============================================================
// HELPERS
// ============================================================

function getDefaultTargeting() {
  return {
    flexible_spec: [
      {
        interests: [
          { name: 'Interested in Health and Wellness', id: '6003139' }
        ]
      }
    ]
  };
}

function cleanupUploadedFiles(files) {
  if (!files || !Array.isArray(files)) return;
  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`[CLEANUP] Archivo eliminado: ${file.path}`);
      }
    } catch (err) {
      console.warn(`[CLEANUP] No se pudo eliminar ${file.path}:`, err.message);
    }
  }
}

async function sendNotifications(userId, campaignName, campaignId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT notifications_email, notifications_whatsapp FROM settings WHERE user_id = ?', [userId], async (err, settings) => {
      if (err) {
        console.error('[NOTIFICATIONS] Error fetching settings:', err.message);
        return resolve({ whatsapp_link: null });
      }

      if (!settings) {
        return resolve({ whatsapp_link: null });
      }

      const result = { whatsapp_link: null };
      const notificationMessage = `Tu campaña "${campaignName}" ha sido publicada exitosamente en Meta Ads. ID: ${campaignId}`;

      // Try to send email
      if (settings.notifications_email) {
        try {
          const nodemailer = (await import('nodemailer')).default;
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 1025,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            } : undefined,
            logger: process.env.SMTP_HOST ? undefined : true
          });

          const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'adpilot@localhost',
            to: settings.notifications_email,
            subject: `[AdPilot] Campaña publicada: ${campaignName}`,
            html: `
              <h2>¡Campaña publicada exitosamente!</h2>
              <p><strong>${campaignName}</strong></p>
              <p>Tu campaña ya está activa en Meta Ads.</p>
              <p><small>ID de campaña: ${campaignId}</small></p>
            `
          });

          console.log('[NOTIFICATIONS] Email sent:', info.messageId);
        } catch (emailErr) {
          console.log('[NOTIFICATIONS] Email notification (console fallback):', notificationMessage, 'To:', settings.notifications_email);
        }
      }

      // Generate WhatsApp link
      if (settings.notifications_whatsapp) {
        const phoneNumber = settings.notifications_whatsapp.replace(/\D/g, '');
        const whatsappText = encodeURIComponent(notificationMessage);
        result.whatsapp_link = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${whatsappText}`;
        console.log('[NOTIFICATIONS] WhatsApp link generated for:', settings.notifications_whatsapp);
      }

      resolve(result);
    });
  });
}

function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
}

// Get user's Meta connection from meta_connections table (new approach)
function getUserMetaConnection(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM meta_connections WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId],
      (err, connection) => {
        if (err) reject(err);
        else resolve(connection);
      }
    );
  });
}

// Get user's Meta access token (from meta_connections or fallback to users table)
async function getUserMetaAccessToken(userId) {
  // Try meta_connections first (new approach)
  const connection = await getUserMetaConnection(userId);
  if (connection) {
    return connection.access_token;
  }

  // Fallback to users table
  const user = await getUser(userId);
  return user?.meta_access_token || null;
}

export default router;
