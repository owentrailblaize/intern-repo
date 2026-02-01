-- Admin Profiles Table
-- Links Supabase Auth users to Nucleus admin access

CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  seniority INTEGER NOT NULL DEFAULT 1 CHECK (seniority BETWEEN 1 AND 5),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON admin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON admin_profiles(email);

-- Enable Row Level Security
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile (primary policy for login)
CREATE POLICY "Users can view own profile" ON admin_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can read profiles that match their email (fallback)
CREATE POLICY "Users can view profile by email" ON admin_profiles
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Admins can view all profiles
-- Note: Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Admins can view all profiles" ON admin_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() AND role = 'admin' AND seniority >= 4
    )
  );

-- Policy: Admins can manage profiles (insert/update/delete)
CREATE POLICY "Admins can manage profiles" ON admin_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() AND role = 'admin' AND seniority >= 4
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_admin_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_profiles_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_profile_timestamp();


-- =====================================================
-- SETUP INSTRUCTIONS FOR OWEN'S ADMIN ACCOUNT
-- =====================================================
-- 
-- Step 1: Create your account in Supabase Auth
-- Go to: Supabase Dashboard → Authentication → Users → Add User
-- Email: owen@trailblaize.net
-- Password: (choose a secure password)
-- 
-- Step 2: After creating the user, get the user's UUID from the Users table
-- 
-- Step 3: Run this INSERT with the actual UUID:
-- 
-- INSERT INTO admin_profiles (user_id, email, name, role, seniority) VALUES (
--   'YOUR-USER-UUID-HERE',
--   'owen@trailblaize.net',
--   'Owen',
--   'admin',
--   5
-- );
-- 
-- Example (replace with your actual UUID):
-- INSERT INTO admin_profiles (user_id, email, name, role, seniority) VALUES (
--   '12345678-abcd-1234-abcd-123456789012',
--   'owen@trailblaize.net',
--   'Owen',
--   'admin',
--   5
-- );
-- =====================================================
