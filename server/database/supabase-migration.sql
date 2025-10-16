-- Supabase/PostgreSQL Migration Script
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    assigned_brands JSONB, -- JSON array of brand IDs (using JSONB for better performance)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    action TEXT NOT NULL,
    ai_model TEXT,
    credits_used INTEGER DEFAULT 1,
    metadata JSONB, -- JSON metadata (using JSONB)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage limits table
CREATE TABLE IF NOT EXISTS usage_limits (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    user_id INTEGER,
    category_id TEXT,
    daily_limit INTEGER DEFAULT 0,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, user_id, category_id)
);

-- Global credits table
CREATE TABLE IF NOT EXISTS global_credits (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    daily_limit INTEGER DEFAULT 100,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT,
    description TEXT,
    products JSONB NOT NULL, -- JSON array of products (using JSONB)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_limits_date ON usage_limits(date);
CREATE INDEX IF NOT EXISTS idx_global_credits_date ON global_credits(date);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read their own data"
    ON users FOR SELECT
    USING (true); -- Will be filtered by application logic

CREATE POLICY "Service role can do anything with users"
    ON users FOR ALL
    USING (true);

-- RLS Policies for activity_logs
CREATE POLICY "Users can read their own activity logs"
    ON activity_logs FOR SELECT
    USING (true); -- Will be filtered by application logic

CREATE POLICY "Service role can do anything with activity_logs"
    ON activity_logs FOR ALL
    USING (true);

-- RLS Policies for usage_limits
CREATE POLICY "Users can read usage limits"
    ON usage_limits FOR SELECT
    USING (true);

CREATE POLICY "Service role can do anything with usage_limits"
    ON usage_limits FOR ALL
    USING (true);

-- RLS Policies for global_credits
CREATE POLICY "Users can read global credits"
    ON global_credits FOR SELECT
    USING (true);

CREATE POLICY "Service role can do anything with global_credits"
    ON global_credits FOR ALL
    USING (true);

-- RLS Policies for brands
CREATE POLICY "Users can read brands"
    ON brands FOR SELECT
    USING (true);

CREATE POLICY "Service role can do anything with brands"
    ON brands FOR ALL
    USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_limits_updated_at BEFORE UPDATE ON usage_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_credits_updated_at BEFORE UPDATE ON global_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
