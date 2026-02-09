import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'app.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Run migrations for existing databases
function runMigrations() {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasAssignedBrands = tableInfo.some(col => col.name === 'assigned_brands');

  if (!hasAssignedBrands) {
    db.exec('ALTER TABLE users ADD COLUMN assigned_brands TEXT');
  }

  const hasDailyCreditLimit = tableInfo.some(col => col.name === 'daily_credit_limit');

  if (!hasDailyCreditLimit) {
    db.exec('ALTER TABLE users ADD COLUMN daily_credit_limit INTEGER DEFAULT 0');
  }

  try {
    const generatedImagesInfo = db.prepare("PRAGMA table_info(generated_images)").all();
    const hasMediaType = generatedImagesInfo.some(col => col.name === 'media_type');

    if (!hasMediaType) {
      db.exec('ALTER TABLE generated_images ADD COLUMN media_type TEXT DEFAULT "image"');
      db.exec('ALTER TABLE generated_images ADD COLUMN duration INTEGER');
    }
  } catch (err) {
    // Table doesn't exist yet, will be created by schema
  }
}

runMigrations();

// Seed default data
function seedDefaultData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (userCount.count === 0) {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const userPasswordHash = bcrypt.hashSync('user123', 10);

    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, assigned_brands) VALUES (?, ?, ?, ?)');
    insertUser.run('admin', adminPasswordHash, 'admin', JSON.stringify(['dirol', 'oreo']));
    insertUser.run('user', userPasswordHash, 'user', JSON.stringify(['dirol']));
  } else {
    const users = db.prepare('SELECT id, username, role, assigned_brands FROM users').all();
    const updateBrands = db.prepare('UPDATE users SET assigned_brands = ? WHERE id = ?');

    users.forEach(user => {
      if (!user.assigned_brands) {
        const brands = user.role === 'admin' ? ['dirol', 'oreo'] : ['dirol'];
        updateBrands.run(JSON.stringify(brands), user.id);
      }
    });
  }

  const brandCount = db.prepare('SELECT COUNT(*) as count FROM brands').get();

  if (brandCount.count === 0) {
    const brandsDataPath = path.join(__dirname, 'brands-data.json');
    const brandsData = JSON.parse(fs.readFileSync(brandsDataPath, 'utf-8'));

    const insertBrand = db.prepare('INSERT INTO brands (id, name, logo, description, products) VALUES (?, ?, ?, ?, ?)');

    brandsData.brands.forEach(brand => {
      insertBrand.run(brand.id, brand.name, brand.logo, brand.description, JSON.stringify(brand.products));
    });
  }
}

seedDefaultData();

function seedDefaultSettings() {
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();

  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (category, value, label, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)');

    const lightingStyles = [
      { value: 'bright', label: 'Bright', description: 'Bright, even studio lighting' },
      { value: 'soft', label: 'Soft', description: 'Soft diffused lighting' },
      { value: 'dramatic', label: 'Dramatic', description: 'Dramatic lighting with strong shadows' },
      { value: 'golden', label: 'Golden Hour', description: 'Warm golden hour lighting' },
      { value: 'natural', label: 'Natural', description: 'Soft natural lighting' }
    ];

    lightingStyles.forEach((style, idx) => {
      insertSetting.run('lighting', style.value, style.label, style.description, 1, idx);
    });

    const cameraAngles = [
      { value: 'default', label: 'Default (Eye Level)', description: 'Standard eye-level perspective' },
      { value: '45deg', label: '45 Degree', description: '45-degree angled view' },
      { value: 'top', label: 'Top Down', description: 'Overhead bird\'s eye view' },
      { value: 'closeup', label: 'Close-up', description: 'Close-up detail shot' },
      { value: 'side', label: 'Side View', description: 'Side profile view' }
    ];

    cameraAngles.forEach((angle, idx) => {
      insertSetting.run('camera_angle', angle.value, angle.label, angle.description, 1, idx);
    });

    const backgroundTypes = [
      { value: 'white', label: 'Pure White', description: 'Clean white background' },
      { value: 'gradient', label: 'Gradient', description: 'Smooth gradient background' },
      { value: 'studio', label: 'Studio', description: 'Professional studio backdrop' },
      { value: 'natural', label: 'Natural', description: 'Natural environment setting' },
      { value: 'minimalist', label: 'Minimalist', description: 'Minimal, clean background' }
    ];

    backgroundTypes.forEach((bg, idx) => {
      insertSetting.run('background', bg.value, bg.label, bg.description, 1, idx);
    });
  }
}

seedDefaultSettings();

// Helper
export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// User queries
export const userQueries = {
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare('SELECT id, username, role, assigned_brands, daily_credit_limit, created_at FROM users WHERE id = ?'),
  create: db.prepare('INSERT INTO users (username, password_hash, role, assigned_brands, daily_credit_limit) VALUES (?, ?, ?, ?, ?)'),
  updatePassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  updateBrands: db.prepare('UPDATE users SET assigned_brands = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  updateCore: db.prepare(`
    UPDATE users
    SET username = ?, role = ?, assigned_brands = ?, daily_credit_limit = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM users WHERE id = ?'),
  list: db.prepare('SELECT id, username, role, assigned_brands, daily_credit_limit, created_at FROM users ORDER BY created_at DESC'),
  countAdmins: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
  countOtherAdmins: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != ?")
};

// Brand queries
export const brandQueries = {
  findById: db.prepare('SELECT * FROM brands WHERE id = ?'),
  findAll: db.prepare('SELECT * FROM brands ORDER BY name'),
  create: db.prepare('INSERT INTO brands (id, name, logo, description, products) VALUES (?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE brands SET name = ?, logo = ?, description = ?, products = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  delete: db.prepare('DELETE FROM brands WHERE id = ?')
};

// Activity log queries
export const activityQueries = {
  create: db.prepare(`
    INSERT INTO activity_logs (user_id, category_id, action, ai_model, credits_used, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  findByUser: db.prepare(`
    SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `),
  findAll: db.prepare(`
    SELECT al.*, u.username
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT ?
  `),
  getUserStatsByDate: db.prepare(`
    SELECT
      u.id as user_id, u.username, u.role,
      COUNT(al.id) as total_requests,
      SUM(al.credits_used) as total_credits,
      MAX(al.created_at) as last_activity
    FROM users u
    LEFT JOIN activity_logs al ON u.id = al.user_id AND DATE(al.created_at) = ?
    GROUP BY u.id, u.username, u.role
    ORDER BY total_credits DESC, u.username ASC
  `),
  getCategoryStatsByDate: db.prepare(`
    SELECT
      category_id,
      COUNT(*) as total_requests,
      SUM(credits_used) as total_credits,
      COUNT(DISTINCT user_id) as unique_users
    FROM activity_logs
    WHERE DATE(created_at) = ?
    GROUP BY category_id
    ORDER BY total_credits DESC
  `),
  getUserDailyCreditsUsed: db.prepare(`
    SELECT COALESCE(SUM(credits_used), 0) as total_credits
    FROM activity_logs
    WHERE user_id = ? AND DATE(created_at) = ?
  `)
};

// Usage limits queries
export const usageLimitQueries = {
  get: db.prepare('SELECT * FROM usage_limits WHERE date = ? AND user_id IS NULL AND category_id = ?'),
  upsert: db.prepare(`
    INSERT INTO usage_limits (date, user_id, category_id, daily_limit, used)
    VALUES (?, NULL, ?, ?, ?)
    ON CONFLICT(date, user_id, category_id) DO UPDATE SET
      daily_limit = excluded.daily_limit,
      used = excluded.used,
      updated_at = CURRENT_TIMESTAMP
  `),
  increment: db.prepare(`
    INSERT INTO usage_limits (date, user_id, category_id, daily_limit, used)
    VALUES (?, NULL, ?, 0, ?)
    ON CONFLICT(date, user_id, category_id) DO UPDATE SET
      used = used + excluded.used,
      updated_at = CURRENT_TIMESTAMP
  `),
  getAllForDate: db.prepare('SELECT * FROM usage_limits WHERE date = ? AND user_id IS NULL')
};

// Global credits queries
export const globalCreditsQueries = {
  get: db.prepare('SELECT * FROM global_credits WHERE date = ?'),
  upsert: db.prepare(`
    INSERT INTO global_credits (date, daily_limit, used)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      daily_limit = excluded.daily_limit,
      used = excluded.used,
      updated_at = CURRENT_TIMESTAMP
  `),
  increment: db.prepare(`
    INSERT INTO global_credits (date, daily_limit, used)
    VALUES (?, 100, ?)
    ON CONFLICT(date) DO UPDATE SET
      used = used + excluded.used,
      updated_at = CURRENT_TIMESTAMP
  `),
  setLimit: db.prepare(`
    INSERT INTO global_credits (date, daily_limit, used)
    VALUES (?, ?, 0)
    ON CONFLICT(date) DO UPDATE SET
      daily_limit = excluded.daily_limit,
      updated_at = CURRENT_TIMESTAMP
  `)
};

// Settings queries
export const settingsQueries = {
  findAll: db.prepare('SELECT * FROM settings ORDER BY category, sort_order, label'),
  findByCategory: db.prepare('SELECT * FROM settings WHERE category = ? ORDER BY sort_order, label'),
  findActiveByCategory: db.prepare('SELECT * FROM settings WHERE category = ? AND is_active = 1 ORDER BY sort_order, label'),
  findById: db.prepare('SELECT * FROM settings WHERE id = ?'),
  findByValue: db.prepare('SELECT * FROM settings WHERE value = ?'),
  create: db.prepare(`
    INSERT INTO settings (category, value, label, description, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  update: db.prepare(`
    INSERT OR REPLACE INTO settings (id, category, value, label, description, is_active, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `),
  delete: db.prepare('DELETE FROM settings WHERE id = ?'),
  toggleActive: db.prepare('UPDATE settings SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
};

// Transaction helper
export function transaction(fn) {
  return db.transaction(fn);
}

// Generated images queries
export const generatedImageQueries = {
  create: db.prepare(`
    INSERT INTO generated_images (user_id, category_id, image_url, thumbnail_url, prompt, metadata, ai_model, media_type, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  findByUserId: db.prepare(`
    SELECT * FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `),
  findByUserIdAndCategory: db.prepare(`
    SELECT * FROM generated_images WHERE user_id = ? AND category_id = ? ORDER BY created_at DESC LIMIT ?
  `),
  findById: db.prepare('SELECT * FROM generated_images WHERE id = ?'),
  toggleFavorite: db.prepare(`
    UPDATE generated_images SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM generated_images WHERE id = ?')
};

export default db;
