import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'app.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Initialize database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Seed default users if table is empty
function seedDefaultUsers() {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (count.count === 0) {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const userPasswordHash = bcrypt.hashSync('user123', 10);

    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    insertUser.run('admin', adminPasswordHash, 'admin');
    insertUser.run('user', userPasswordHash, 'user');

    console.log('✓ Default users created (admin/admin123, user/user123)');
  }
}

seedDefaultUsers();

// Helper to get today's date in YYYY-MM-DD format
export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// User operations
export const userQueries = {
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?'),
  create: db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'),
  updatePassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  delete: db.prepare('DELETE FROM users WHERE id = ?'),
  list: db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC')
};

// Activity log operations
export const activityQueries = {
  create: db.prepare(`
    INSERT INTO activity_logs (user_id, category_id, action, ai_model, credits_used, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  findByUser: db.prepare(`
    SELECT * FROM activity_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `),
  findByDateRange: db.prepare(`
    SELECT * FROM activity_logs
    WHERE created_at BETWEEN ? AND ?
    ORDER BY created_at DESC
  `),
  findAll: db.prepare(`
    SELECT al.*, u.username
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT ?
  `)
};

// Usage limits operations
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

// Global credits operations
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

// Transaction helper
export function transaction(fn) {
  return db.transaction(fn);
}

export default db;
