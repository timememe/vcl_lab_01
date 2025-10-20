/**
 * One-time migration script to sync existing settings from SQLite to Supabase
 * Run with: node server/database/migrate-settings-to-supabase.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSupabase, getSupabase, isSupabaseAvailable } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'app.db');

async function migrateSettings() {
  console.log('🚀 Starting settings migration from SQLite to Supabase...\n');

  // Initialize Supabase
  initSupabase();

  if (!isSupabaseAvailable()) {
    console.error('❌ Supabase is not available. Please check your environment variables.');
    process.exit(1);
  }

  const supabase = getSupabase();
  const db = new Database(dbPath);

  try {
    // Get all settings from SQLite
    const sqliteSettings = db.prepare('SELECT * FROM settings ORDER BY id').all();
    console.log(`📊 Found ${sqliteSettings.length} settings in SQLite\n`);

    if (sqliteSettings.length === 0) {
      console.log('✓ No settings to migrate');
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const setting of sqliteSettings) {
      const { id, category, value, label, description, is_active, sort_order, created_at, updated_at } = setting;

      console.log(`Migrating: ${category}/${value} (${label})`);

      // Check if already exists in Supabase
      const { data: existing, error: checkError } = await supabase
        .from('settings')
        .select('id')
        .eq('value', value)
        .single();

      if (existing) {
        console.log(`  ⏭️  Already exists in Supabase (id: ${existing.id})`);
        skipCount++;
        continue;
      }

      // Insert into Supabase (without id, let it auto-generate)
      const { data, error } = await supabase
        .from('settings')
        .insert({
          category,
          value,
          label,
          description,
          is_active: is_active === 1, // Convert integer to boolean
          sort_order,
          created_at,
          updated_at
        })
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Error:`, error.message);
        errorCount++;
      } else {
        console.log(`  ✓ Migrated successfully (new id: ${data.id})`);
        successCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  ✓ Successfully migrated: ${successCount}`);
    console.log(`  ⏭️  Skipped (already exist): ${skipCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total processed: ${sqliteSettings.length}`);

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
migrateSettings().catch(console.error);
