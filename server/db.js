import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'adpilot.db');

const sqliteDb = new DatabaseSync(dbPath);
sqliteDb.exec('PRAGMA foreign_keys = ON');

// Wrapper that mimics the sqlite3 callback API used throughout the codebase
const db = {
  run(sql, params, callback) {
    try {
      if (typeof params === 'function') { callback = params; params = []; }
      const stmt = sqliteDb.prepare(sql);
      const result = stmt.run(...(params || []));
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  },
  get(sql, params, callback) {
    try {
      if (typeof params === 'function') { callback = params; params = []; }
      const stmt = sqliteDb.prepare(sql);
      const row = stmt.get(...(params || []));
      if (callback) callback(null, row);
      return row;
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  },
  all(sql, params, callback) {
    try {
      if (typeof params === 'function') { callback = params; params = []; }
      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...(params || []));
      if (callback) callback(null, rows);
      return rows;
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  },
  exec(sql) { sqliteDb.exec(sql); }
};

export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        plan TEXT DEFAULT 'starter',
        meta_account_id TEXT,
        meta_connected BOOLEAN DEFAULT 0,
        meta_access_token TEXT,
        meta_token_expires TEXT,
        meta_user_id TEXT,
        meta_user_name TEXT,
        meta_ad_accounts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        product TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        budget REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        creatives_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS creatives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        naming_template TEXT DEFAULT '{producto} {fecha} [CBO Testeo {tipo}]',
        start_date_mode TEXT DEFAULT 'next_day',
        start_day_offset INTEGER DEFAULT 1,
        campaign_hour INTEGER DEFAULT 9,
        default_budget REAL DEFAULT 50,
        notifications_email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS product_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        ad_account_id TEXT,
        base_campaign_id TEXT,
        base_campaign_name TEXT,
        daily_budget REAL DEFAULT 40,
        product_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS drive_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        drive_token TEXT,
        drive_refresh_token TEXT,
        parent_folder_id TEXT,
        parent_folder_name TEXT,
        month_folders TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1,
        scan_interval_minutes INTEGER DEFAULT 120,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS auto_publish_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        folder_id TEXT NOT NULL,
        folder_name TEXT NOT NULL,
        product TEXT,
        creative_type TEXT,
        campaign_name TEXT,
        meta_campaign_id TEXT,
        meta_adset_id TEXT,
        ads_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS creative_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_preset_id INTEGER,
        product_name TEXT NOT NULL,
        batch_date TEXT NOT NULL,
        creative_type TEXT,
        files_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'uploaded',
        meta_campaign_id TEXT,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_preset_id) REFERENCES product_presets(id) ON DELETE SET NULL
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS creative_batch_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        thumbnail_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES creative_batches(id) ON DELETE CASCADE
      )`);

      sqliteDb.exec(`CREATE TABLE IF NOT EXISTS meta_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        access_token TEXT NOT NULL,
        token_type TEXT DEFAULT 'long_lived',
        expires_at TEXT,
        fb_user_id TEXT,
        fb_user_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Migrations: add columns if missing (errors ignored — column may already exist)
      const migrations = [
        `ALTER TABLE campaigns ADD COLUMN meta_campaign_id TEXT`,
        `ALTER TABLE campaigns ADD COLUMN published_at DATETIME`,
        `ALTER TABLE settings ADD COLUMN default_ad_account TEXT`,
        `ALTER TABLE campaigns ADD COLUMN archived INTEGER DEFAULT 0`,
        `ALTER TABLE campaigns ADD COLUMN meta_status TEXT`,
        `ALTER TABLE settings ADD COLUMN notifications_whatsapp TEXT`,
        `ALTER TABLE product_presets ADD COLUMN default_body TEXT`,
        `ALTER TABLE product_presets ADD COLUMN default_title TEXT`,
        `ALTER TABLE product_presets ADD COLUMN default_description TEXT`,
        `ALTER TABLE product_presets ADD COLUMN default_cta TEXT DEFAULT 'SHOP_NOW'`,
        `ALTER TABLE product_presets ADD COLUMN default_objective TEXT DEFAULT 'OUTCOME_SALES'`,
        `ALTER TABLE product_presets ADD COLUMN is_default_account INTEGER DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN google_id TEXT`,
        `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
        `ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'`
      ];

      for (const migration of migrations) {
        try { sqliteDb.exec(migration); } catch (e) { /* column already exists */ }
      }

      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export default db;
