import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

// Initialize Supabase client
export function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️  Supabase credentials not configured. Using SQLite only.');
    return null;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✓ Supabase client initialized');
    return supabase;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return null;
  }
}

// Check if Supabase is available
export function isSupabaseAvailable() {
  return supabase !== null;
}

// Get Supabase client
export function getSupabase() {
  if (!supabase) {
    supabase = initSupabase();
  }
  return supabase;
}

// Helper to convert SQLite row to Supabase format
export function formatForSupabase(tableName, data) {
  const formatted = { ...data };

  // Convert TEXT JSON fields to JSONB
  if (tableName === 'users' && formatted.assigned_brands) {
    try {
      formatted.assigned_brands = typeof formatted.assigned_brands === 'string'
        ? JSON.parse(formatted.assigned_brands)
        : formatted.assigned_brands;
    } catch (e) {
      formatted.assigned_brands = null;
    }
  }

  if (tableName === 'brands' && formatted.products) {
    try {
      formatted.products = typeof formatted.products === 'string'
        ? JSON.parse(formatted.products)
        : formatted.products;
    } catch (e) {
      formatted.products = [];
    }
  }

  if (tableName === 'activity_logs' && formatted.metadata) {
    try {
      formatted.metadata = typeof formatted.metadata === 'string'
        ? JSON.parse(formatted.metadata)
        : formatted.metadata;
    } catch (e) {
      formatted.metadata = null;
    }
  }

  // Convert DATE fields
  if (formatted.date && typeof formatted.date === 'string') {
    // Keep as string, PostgreSQL will handle it
  }

  // Convert integer to boolean for settings
  if (tableName === 'settings' && typeof formatted.is_active === 'number') {
    formatted.is_active = formatted.is_active === 1;
  }

  // Debug logging for settings updates
  if (tableName === 'settings') {
    console.log('📤 Formatting settings for Supabase:', {
      id: formatted.id,
      value: formatted.value,
      description: formatted.description,
      is_active: formatted.is_active
    });
  }

  return formatted;
}

// Helper to convert Supabase row to SQLite format
export function formatFromSupabase(tableName, data) {
  const formatted = { ...data };

  // Convert JSONB to TEXT JSON
  if (tableName === 'users' && formatted.assigned_brands) {
    formatted.assigned_brands = JSON.stringify(formatted.assigned_brands);
  }

  if (tableName === 'brands' && formatted.products) {
    formatted.products = JSON.stringify(formatted.products);
  }

  if (tableName === 'activity_logs' && formatted.metadata) {
    formatted.metadata = JSON.stringify(formatted.metadata);
  }

  // Convert boolean to integer for settings
  if (tableName === 'settings' && typeof formatted.is_active === 'boolean') {
    formatted.is_active = formatted.is_active ? 1 : 0;
  }

  return formatted;
}

// Sync SQLite data to Supabase
export async function syncToSupabase(tableName, data) {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase not available' };

  try {
    const formatted = formatForSupabase(tableName, data);

    // Use upsert to handle conflicts
    const { error } = await sb
      .from(tableName)
      .upsert(formatted, {
        onConflict: tableName === 'brands' ? 'id' : undefined,
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Supabase sync error for ${tableName}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error(`Supabase sync exception for ${tableName}:`, error);
    return { success: false, error: error.message };
  }
}

// Query Supabase
export async function querySupabase(tableName, options = {}) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: 'Supabase not available' };

  try {
    let query = sb.from(tableName).select(options.select || '*');

    // Apply filters
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Supabase query error for ${tableName}:`, error);
      return { data: null, error: error.message };
    }

    // Convert back to SQLite format if needed
    const formattedData = data ? data.map(row => formatFromSupabase(tableName, row)) : null;

    return { data: formattedData, error: null };
  } catch (error) {
    console.error(`Supabase query exception for ${tableName}:`, error);
    return { data: null, error: error.message };
  }
}

export default { initSupabase, getSupabase, isSupabaseAvailable, syncToSupabase, querySupabase };
