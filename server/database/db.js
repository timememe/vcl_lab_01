import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { initSupabase, syncToSupabase, isSupabaseAvailable } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase
initSupabase();

const dbPath = path.join(__dirname, 'app.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Initialize database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Run migrations for existing databases
function runMigrations() {
  // Check if assigned_brands column exists
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasAssignedBrands = tableInfo.some(col => col.name === 'assigned_brands');

  if (!hasAssignedBrands) {
    console.log('⚙️  Running migration: Adding assigned_brands column to users table');
    db.exec('ALTER TABLE users ADD COLUMN assigned_brands TEXT');
  }
}

runMigrations();

// Seed default users and brands
function seedDefaultData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (userCount.count === 0) {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const userPasswordHash = bcrypt.hashSync('user123', 10);

    // Admin gets all brands, user gets only Dirol
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, assigned_brands) VALUES (?, ?, ?, ?)');
    insertUser.run('admin', adminPasswordHash, 'admin', JSON.stringify(['dirol', 'oreo']));
    insertUser.run('user', userPasswordHash, 'user', JSON.stringify(['dirol']));

    console.log('✓ Default users created (admin: all brands, user: Dirol only)');
  } else {
    // Update existing users with assigned_brands if they don't have it
    const users = db.prepare('SELECT id, username, role, assigned_brands FROM users').all();
    const updateBrands = db.prepare('UPDATE users SET assigned_brands = ? WHERE id = ?');

    users.forEach(user => {
      if (!user.assigned_brands) {
        const brands = user.role === 'admin' ? ['dirol', 'oreo'] : ['dirol'];
        updateBrands.run(JSON.stringify(brands), user.id);
        console.log(`⚙️  Assigned brands to existing user: ${user.username}`);
      }
    });
  }

  // Seed brands from brands-data.json
  const brandCount = db.prepare('SELECT COUNT(*) as count FROM brands').get();

  if (brandCount.count === 0) {
    const brandsDataPath = path.join(__dirname, 'brands-data.json');
    const brandsData = JSON.parse(fs.readFileSync(brandsDataPath, 'utf-8'));

    const insertBrand = db.prepare('INSERT INTO brands (id, name, logo, description, products) VALUES (?, ?, ?, ?, ?)');

    brandsData.brands.forEach(brand => {
      insertBrand.run(
        brand.id,
        brand.name,
        brand.logo,
        brand.description,
        JSON.stringify(brand.products)
      );
    });

    console.log(`✓ ${brandsData.brands.length} brands seeded (Dirol, Oreo)`);
  }
}

seedDefaultData();

// Helper to get today's date in YYYY-MM-DD format
export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// User operations
export const userQueries = {
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findById: db.prepare('SELECT id, username, role, assigned_brands, created_at FROM users WHERE id = ?'),
  create: db.prepare('INSERT INTO users (username, password_hash, role, assigned_brands) VALUES (?, ?, ?, ?)'),
  updatePassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  updateBrands: db.prepare('UPDATE users SET assigned_brands = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  updateCore: db.prepare(`
    UPDATE users
    SET username = ?, role = ?, assigned_brands = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM users WHERE id = ?'),
  list: db.prepare('SELECT id, username, role, assigned_brands, created_at FROM users ORDER BY created_at DESC'),
  countAdmins: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
  countOtherAdmins: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != ?")
};

// Brand operations
export const brandQueries = {
  findById: db.prepare('SELECT * FROM brands WHERE id = ?'),
  findAll: db.prepare('SELECT * FROM brands ORDER BY name'),
  create: db.prepare('INSERT INTO brands (id, name, logo, description, products) VALUES (?, ?, ?, ?, ?)'),
  update: db.prepare('UPDATE brands SET name = ?, logo = ?, description = ?, products = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  delete: db.prepare('DELETE FROM brands WHERE id = ?')
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

// Dual-write wrapper: Execute SQLite query and sync to Supabase
export function dualWrite(tableName, operation, sqliteQuery, ...params) {
  try {
    // Execute SQLite operation
    const result = sqliteQuery.run(...params);

    // Sync to Supabase asynchronously (don't block on Supabase)
    if (isSupabaseAvailable()) {
      // Extract the data that was just written
      let dataToSync = null;

      if (operation === 'create' || operation === 'update') {
        // For inserts/updates, we need to fetch the row
        if (tableName === 'users' && result.lastInsertRowid) {
          dataToSync = userQueries.findById.get(result.lastInsertRowid);
        } else if (tableName === 'brands' && params[0]) {
          // Brand ID is first param
          dataToSync = brandQueries.findById.get(params[0]);
        } else if (tableName === 'activity_logs' && result.lastInsertRowid) {
          dataToSync = db.prepare('SELECT * FROM activity_logs WHERE id = ?').get(result.lastInsertRowid);
        } else if (tableName === 'usage_limits' || tableName === 'global_credits') {
          // For upsert operations, we can construct the data from params
          // This is handled in the specific wrapper functions below
        }
      }

      if (dataToSync) {
        syncToSupabase(tableName, dataToSync).catch(err => {
          console.error(`⚠️  Supabase sync failed for ${tableName}:`, err);
        });
      }
    }

    return result;
  } catch (error) {
    console.error(`SQLite operation failed for ${tableName}:`, error);
    throw error;
  }
}

// Wrapper for user operations with dual-write
export const userQueriesWithSync = {
  ...userQueries,
  create: (...params) => dualWrite('users', 'create', userQueries.create, ...params),
  updatePassword: (...params) => dualWrite('users', 'update', userQueries.updatePassword, ...params),
  updateBrands: (...params) => dualWrite('users', 'update', userQueries.updateBrands, ...params),
  updateCore: (...params) => dualWrite('users', 'update', userQueries.updateCore, ...params),
  delete: (...params) => dualWrite('users', 'delete', userQueries.delete, ...params),
};

// Wrapper for brand operations with dual-write
export const brandQueriesWithSync = {
  ...brandQueries,
  create: (...params) => dualWrite('brands', 'create', brandQueries.create, ...params),
  update: (...params) => dualWrite('brands', 'update', brandQueries.update, ...params),
  delete: (...params) => dualWrite('brands', 'delete', brandQueries.delete, ...params),
};

// Wrapper for activity log operations with dual-write
export const activityQueriesWithSync = {
  ...activityQueries,
  create: (...params) => dualWrite('activity_logs', 'create', activityQueries.create, ...params),
};

export default db;
