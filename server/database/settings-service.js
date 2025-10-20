/**
 * Settings Service - Unified interface for settings operations
 * Reads from Supabase (primary) with SQLite fallback
 * Writes to both (dual-write via settingsQueriesWithSync)
 */

import { settingsQueries } from './db.js';
import { getSupabase, formatFromSupabase, isSupabaseAvailable } from './supabase.js';

// Try Supabase first, fallback to SQLite
export async function findAllSettings() {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('category')
        .order('sort_order')
        .order('label');

      if (!error && data && data.length > 0) {
        console.log('✓ Settings loaded from Supabase:', data.length);
        return data.map(row => formatFromSupabase('settings', row));
      }

      console.log('⚠️  Settings not in Supabase, checking SQLite');
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  const settings = settingsQueries.findAll.all();
  console.log('✓ Settings loaded from SQLite:', settings.length);
  return settings;
}

// Try Supabase first, fallback to SQLite
export async function findSettingsByCategory(category) {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('category', category)
        .order('sort_order')
        .order('label');

      if (!error && data && data.length > 0) {
        console.log(`✓ Settings (${category}) loaded from Supabase:`, data.length);
        return data.map(row => formatFromSupabase('settings', row));
      }

      console.log(`⚠️  Settings (${category}) not in Supabase, checking SQLite`);
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  const settings = settingsQueries.findByCategory.all(category);
  console.log(`✓ Settings (${category}) loaded from SQLite:`, settings.length);
  return settings;
}

// Try Supabase first, fallback to SQLite
export async function findActiveSettingsByCategory(category) {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order')
        .order('label');

      if (!error && data && data.length > 0) {
        console.log(`✓ Active settings (${category}) loaded from Supabase:`, data.length);
        return data.map(row => formatFromSupabase('settings', row));
      }

      console.log(`⚠️  Active settings (${category}) not in Supabase, checking SQLite`);
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  const settings = settingsQueries.findActiveByCategory.all(category);
  console.log(`✓ Active settings (${category}) loaded from SQLite:`, settings.length);
  return settings;
}

// Try Supabase first, fallback to SQLite
export async function findSettingById(id) {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        console.log('✓ Setting loaded from Supabase:', id);
        return formatFromSupabase('settings', data);
      }

      console.log('⚠️  Setting not in Supabase, checking SQLite:', id);
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  const setting = settingsQueries.findById.get(id);
  if (setting) {
    console.log('✓ Setting loaded from SQLite:', id);
  }
  return setting;
}

// Try Supabase first, fallback to SQLite
export async function findSettingByValue(value) {
  if (isSupabaseAvailable()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('value', value)
        .single();

      if (!error && data) {
        console.log('✓ Setting loaded from Supabase by value:', value);
        return formatFromSupabase('settings', data);
      }

      console.log('⚠️  Setting not in Supabase, checking SQLite:', value);
    } catch (error) {
      console.error('Supabase query error:', error);
    }
  }

  // Fallback to SQLite
  const setting = settingsQueries.findByValue.get(value);
  if (setting) {
    console.log('✓ Setting loaded from SQLite by value:', value);
  }
  return setting;
}
