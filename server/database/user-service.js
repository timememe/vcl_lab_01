/**
 * User Service - Unified interface for user operations
 * Reads from Supabase (primary) with SQLite fallback
 * Writes to both (dual-write)
 */

import { userQueries } from './db.js';
import { getSupabase, formatFromSupabase, syncToSupabase, isSupabaseAvailable } from './supabase.js';

// Try Supabase first, fallback to SQLite
export async function findUserByUsername(username) {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (!error && data) {
        console.log('✓ User loaded from Supabase:', username);
        return formatFromSupabase('users', data);
      }

      // If not found in Supabase, try SQLite
      console.log('⚠️  User not in Supabase, checking SQLite:', username);
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  const user = userQueries.findByUsername.get(username);
  if (user) {
    console.log('✓ User loaded from SQLite:', username);
  }
  return user;
}

// Try Supabase first, fallback to SQLite
export async function findUserById(userId) {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, assigned_brands, daily_credit_limit, created_at')
        .eq('id', userId)
        .single();

      if (!error && data) {
        console.log('✓ User loaded from Supabase (id):', userId);
        return formatFromSupabase('users', data);
      }
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  return userQueries.findById.get(userId);
}

// Create user with dual-write
export async function createUser(username, passwordHash, role, assignedBrands, dailyCreditLimit = 0) {
  // Write to SQLite (primary)
  const result = userQueries.create.run(username, passwordHash, role, assignedBrands, dailyCreditLimit);

  // Get the created user with password hash for Supabase sync
  const user = userQueries.findByUsername.get(username);

  // Sync to Supabase asynchronously (includes password_hash)
  if (isSupabaseAvailable() && user) {
    syncToSupabase('users', user).catch(err => {
      console.error('⚠️  Failed to sync new user to Supabase:', err);
    });
  }

  // Return user without password for API response
  return userQueries.findById.get(result.lastInsertRowid);
}

// Update user with dual-write
export async function updateUserCore(username, role, assignedBrands, dailyCreditLimit, userId) {
  // Write to SQLite (primary)
  userQueries.updateCore.run(username, role, assignedBrands, dailyCreditLimit, userId);

  // Get the updated user with password hash for Supabase sync
  const userWithPassword = userQueries.findByUsername.get(username);

  // Sync to Supabase asynchronously (includes password_hash)
  if (isSupabaseAvailable() && userWithPassword) {
    syncToSupabase('users', userWithPassword).catch(err => {
      console.error('⚠️  Failed to sync updated user to Supabase:', err);
    });
  }

  // Return user without password for API response
  return userQueries.findById.get(userId);
}

// Update password with dual-write
export async function updateUserPassword(passwordHash, userId) {
  // Write to SQLite (primary)
  userQueries.updatePassword.run(passwordHash, userId);

  // Get the updated user with password hash for Supabase sync
  const user = userQueries.findByUsername.get(
    userQueries.findById.get(userId)?.username
  );

  // Sync to Supabase asynchronously
  if (isSupabaseAvailable() && user) {
    syncToSupabase('users', user).catch(err => {
      console.error('⚠️  Failed to sync user password to Supabase:', err);
    });
  }
}

// Delete user with dual-write
export async function deleteUser(userId) {
  // Delete from SQLite (primary)
  userQueries.delete.run(userId);

  // Delete from Supabase asynchronously
  if (isSupabaseAvailable()) {
    const supabase = getSupabase();
    supabase.from('users').delete().eq('id', userId).then(({ error }) => {
      if (error) {
        console.error('⚠️  Failed to delete user from Supabase:', error);
      } else {
        console.log('✓ User deleted from Supabase');
      }
    });
  }
}

// List all users (try Supabase first)
export async function listUsers() {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, assigned_brands, daily_credit_limit, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        console.log('✓ Users loaded from Supabase');
        return data.map(row => formatFromSupabase('users', row));
      }
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  console.log('✓ Users loaded from SQLite');
  return userQueries.list.all();
}

// Count admins (try Supabase first)
export async function countAdmins() {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (!error && count !== null) {
        return { count };
      }
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  return userQueries.countAdmins.get();
}

// Export for backward compatibility
export default {
  findUserByUsername,
  findUserById,
  createUser,
  updateUserCore,
  updateUserPassword,
  deleteUser,
  listUsers,
  countAdmins
};
