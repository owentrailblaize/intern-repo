-- Google OAuth Tokens Schema
-- Run this in your Supabase SQL Editor

-- Store Google OAuth tokens for users
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_oauth_employee ON google_oauth_tokens(employee_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_google_oauth_tokens_updated_at ON google_oauth_tokens;
CREATE TRIGGER update_google_oauth_tokens_updated_at
    BEFORE UPDATE ON google_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_google_oauth_updated_at();

-- Enable RLS
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY "Users can view own tokens" ON google_oauth_tokens
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own tokens" ON google_oauth_tokens
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own tokens" ON google_oauth_tokens
    FOR UPDATE USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own tokens" ON google_oauth_tokens
    FOR DELETE USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );
