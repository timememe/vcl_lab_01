# Supabase Migration Guide

## Overview

This guide will help you migrate from SQLite to Supabase PostgreSQL while maintaining data consistency. The migration supports dual-write mode, allowing you to test Supabase while keeping SQLite as a fallback.

## Prerequisites

1. Supabase project created at [supabase.com](https://supabase.com)
2. Environment variables configured on Render:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Service role key (not anon key!)
   - `SUPABASE_ANON_KEY` - Anonymous key (optional, for future client-side use)

## Step 1: Create Tables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `server/database/supabase-migration.sql`
4. Paste and **Run** the SQL script

This will create:
- All tables (users, brands, activity_logs, usage_limits, global_credits)
- Indexes for performance
- Row Level Security (RLS) policies
- Auto-update triggers for `updated_at` columns

## Step 2: Verify Environment Variables

Make sure these are set in your **Render Dashboard** → **Environment**:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-key
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
```

⚠️ **Important**: Use `SUPABASE_SERVICE_KEY`, not `SUPABASE_ANON_KEY` for server-side operations!

## Step 3: Run Data Migration (Local First)

Before deploying to production, test locally:

```bash
# Make sure your .env file has the Supabase credentials
node server/database/migrate-to-supabase.js
```

This script will:
- Copy all existing SQLite data to Supabase
- Show progress for each table
- Report any errors

Expected output:
```
🚀 Starting SQLite → Supabase migration

✓ Supabase connection successful

📦 Migrating users...
   Found 2 rows
   ✓ Synced 2/2 rows (0 errors)

📦 Migrating brands...
   Found 2 rows
   ✓ Synced 2/2 rows (0 errors)

...

✅ Migration completed successfully!
```

## Step 4: Deploy to Render

Once local migration succeeds:

```bash
git add .
git commit -m "Add Supabase dual-write support"
git push
```

Render will automatically deploy. Check the logs to verify Supabase initialization:

```
✓ Supabase client initialized
✓ API server running on port 4000
```

## Step 5: Verify Data Sync

After deployment:

1. Go to Supabase Dashboard → **Table Editor**
2. Check each table has data
3. Create a test user via your app
4. Verify it appears in both:
   - SQLite (if you have local access)
   - Supabase Table Editor

## Current Behavior (Dual-Write Mode)

Your app now operates in **dual-write mode**:

- ✅ **Reads**: From SQLite (fast, local)
- ✅ **Writes**: To SQLite (primary) → Supabase (async backup)
- ✅ **Supabase fails**: App continues normally with SQLite
- ✅ **SQLite only**: If Supabase credentials missing

This ensures:
- Zero downtime during migration
- Data consistency
- Fallback if Supabase has issues

## Monitoring Sync Status

Check server logs for Supabase sync status:

```bash
# On Render Dashboard → Logs
✓ Supabase client initialized          # Good
⚠️  Supabase sync failed for users: ... # Warning (non-critical)
```

Sync failures are **non-critical** - the app will continue using SQLite.

## Step 6: Switch to Supabase Only (Future)

Once you're confident Supabase is working:

1. Update `server/database/db.js` to read from Supabase
2. Keep SQLite for local development only
3. Update queries to use Supabase client directly

This will be done in a future update.

## Troubleshooting

### "Supabase not configured"

**Cause**: Missing environment variables

**Fix**:
1. Go to Render Dashboard → Environment
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. Redeploy

### "RLS policy violation"

**Cause**: Using `SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_KEY`

**Fix**: Make sure server uses `SUPABASE_SERVICE_KEY` (service role)

### "Table does not exist"

**Cause**: Migration SQL not run in Supabase

**Fix**: Run `supabase-migration.sql` in Supabase SQL Editor

### Sync errors in logs

**Effect**: Non-critical, app continues with SQLite

**Fix**: Check Supabase credentials and RLS policies

## Rollback Plan

If anything goes wrong:

1. Supabase sync is **async** and doesn't block the app
2. Remove `SUPABASE_URL` from environment to disable Supabase
3. App will continue using SQLite normally

## Benefits of This Approach

✅ **Zero downtime** - Gradual migration
✅ **Data safety** - Dual-write ensures backup
✅ **Testable** - Test Supabase without risk
✅ **Scalable** - PostgreSQL handles concurrent writes
✅ **Persistent** - No more data loss on Render restarts

## Files Created

- `server/database/supabase-migration.sql` - SQL schema for Supabase
- `server/database/supabase.js` - Supabase client wrapper
- `server/database/migrate-to-supabase.js` - Data migration script
- `server/database/db.js` - Updated with dual-write support

## Questions?

Check the server logs on Render for detailed error messages.
