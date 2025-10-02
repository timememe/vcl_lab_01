/**
 * Migration script to import users from old JSON format to SQLite
 *
 * Usage: node server/migrate-old-data.js
 *
 * This script is optional and only needed if you have existing users.json file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { userQueries } from './database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLD_USERS_PATH = path.join(__dirname, 'data', 'users.json');

async function migrate() {
  if (!fs.existsSync(OLD_USERS_PATH)) {
    console.log('❌ No old users.json file found at:', OLD_USERS_PATH);
    console.log('Nothing to migrate.');
    return;
  }

  console.log('📦 Reading old users.json...');
  const oldData = JSON.parse(fs.readFileSync(OLD_USERS_PATH, 'utf-8'));
  const users = oldData.users || [];

  console.log(`Found ${users.length} users to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      // Check if user already exists
      const existing = userQueries.findByUsername.get(user.username);

      if (existing) {
        console.log(`⏭️  Skipping ${user.username} (already exists)`);
        skipped++;
        continue;
      }

      // Hash the plain-text password
      const passwordHash = bcrypt.hashSync(user.password, 10);

      // Insert new user
      userQueries.create.run(
        user.username,
        passwordHash,
        user.role || 'user'
      );

      console.log(`✅ Migrated user: ${user.username}`);
      migrated++;
    } catch (error) {
      console.error(`❌ Failed to migrate ${user.username}:`, error.message);
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Migrated: ${migrated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📝 Total: ${users.length}`);

  if (migrated > 0) {
    console.log('\n⚠️  SECURITY WARNING:');
    console.log('The migrated users have their old passwords hashed.');
    console.log('Consider asking users to change their passwords!');
  }
}

migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
