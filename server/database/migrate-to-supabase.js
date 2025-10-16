#!/usr/bin/env node

/**
 * Migration script to copy existing SQLite data to Supabase
 *
 * Usage:
 *   node server/database/migrate-to-supabase.js
 *
 * Prerequisites:
 *   1. Run supabase-migration.sql in Supabase SQL Editor
 *   2. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase, syncToSupabase, formatForSupabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'app.db');

async function migrateTable(tableName, db) {
  console.log(`\n📦 Migrating ${tableName}...`);

  try {
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    console.log(`   Found ${rows.length} rows`);

    if (rows.length === 0) {
      console.log(`   ✓ No data to migrate`);
      return { success: true, count: 0 };
    }

    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const result = await syncToSupabase(tableName, row);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`   ✗ Failed to sync row ${row.id || row.date}:`, result.error);
      }
    }

    console.log(`   ✓ Synced ${successCount}/${rows.length} rows (${errorCount} errors)`);
    return { success: errorCount === 0, count: successCount, errors: errorCount };
  } catch (error) {
    console.error(`   ✗ Migration failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting SQLite → Supabase migration\n');

  // Check Supabase connection
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
  }

  // Test connection
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = empty table is OK
      throw error;
    }
    console.log('✓ Supabase connection successful\n');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.error('\nMake sure you have:\n');
    console.error('1. Run supabase-migration.sql in Supabase SQL Editor');
    console.error('2. Set correct SUPABASE_URL and SUPABASE_SERVICE_KEY\n');
    process.exit(1);
  }

  // Open SQLite database
  const db = new Database(dbPath, { readonly: true });

  // Migrate tables in order (respecting foreign keys)
  const tables = [
    'users',
    'brands',
    'activity_logs',
    'usage_limits',
    'global_credits'
  ];

  const results = {};

  for (const table of tables) {
    results[table] = await migrateTable(table, db);
  }

  db.close();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));

  let totalSuccess = 0;
  let totalErrors = 0;

  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✓' : '✗';
    const count = result.count || 0;
    const errors = result.errors || 0;

    console.log(`${status} ${table.padEnd(20)} ${count} rows synced, ${errors} errors`);

    totalSuccess += count;
    totalErrors += errors;
  }

  console.log('='.repeat(60));
  console.log(`Total: ${totalSuccess} rows synced, ${totalErrors} errors\n`);

  if (totalErrors === 0) {
    console.log('✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Supabase dashboard');
    console.log('2. App will now dual-write to both SQLite and Supabase');
    console.log('3. After testing, you can switch fully to Supabase\n');
  } else {
    console.log('⚠️  Migration completed with errors. Please review the logs above.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
