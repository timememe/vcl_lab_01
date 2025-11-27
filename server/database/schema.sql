-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    assigned_brands TEXT, -- JSON array of brand IDs
    daily_credit_limit INTEGER DEFAULT 0, -- Per-user daily credit limit (0 = no limit)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id TEXT NOT NULL,
    action TEXT NOT NULL,
    ai_model TEXT,
    credits_used INTEGER DEFAULT 1,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Usage limits table
CREATE TABLE IF NOT EXISTS usage_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    user_id INTEGER,
    category_id TEXT,
    daily_limit INTEGER DEFAULT 0,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, user_id, category_id)
);

-- Global credits table
CREATE TABLE IF NOT EXISTS global_credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    daily_limit INTEGER DEFAULT 100,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT,
    description TEXT,
    products TEXT NOT NULL, -- JSON array of products
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table for configurable options
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- 'lighting', 'camera_angle', 'background'
    value TEXT NOT NULL UNIQUE, -- The actual value (e.g., 'bright', 'soft', '45deg', 'top')
    label TEXT NOT NULL, -- Display label
    description TEXT, -- Optional description
    is_active INTEGER DEFAULT 1, -- 0 = disabled, 1 = active
    sort_order INTEGER DEFAULT 0, -- For custom ordering
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated images gallery table
CREATE TABLE IF NOT EXISTS generated_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id TEXT NOT NULL, -- Category of generation (product_photo, collage, etc.)
    image_url TEXT NOT NULL, -- Path to the generated image or video
    thumbnail_url TEXT, -- Optional thumbnail for faster loading
    prompt TEXT, -- The prompt used for generation
    metadata TEXT, -- JSON with generation parameters (lighting, background, model, etc.)
    ai_model TEXT, -- AI model used (gemini, openai, veo)
    media_type TEXT DEFAULT 'image', -- Type: 'image' or 'video'
    duration INTEGER, -- Video duration in seconds (null for images)
    is_favorite INTEGER DEFAULT 0, -- User can mark favorites
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_limits_date ON usage_limits(date);
CREATE INDEX IF NOT EXISTS idx_global_credits_date ON global_credits(date);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_category_active ON settings(category, is_active);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_category ON generated_images(category_id);
