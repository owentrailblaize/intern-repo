-- Job Applications Schema - COMPLETE SETUP
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS job_applications CASCADE;

-- Step 2: Create the job_applications table
CREATE TABLE job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL,
  resume_url TEXT,
  cover_letter TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  why_trailblaize TEXT,
  experience TEXT,
  availability TEXT,
  hours_per_week INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'interview', 'offered', 'accepted', 'rejected', 'withdrawn'
  )),
  reviewer_id UUID,
  reviewer_notes TEXT,
  rating INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  source TEXT DEFAULT 'website',
  referral_source TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_position ON job_applications(position);
CREATE INDEX idx_job_applications_applied_at ON job_applications(applied_at DESC);
CREATE INDEX idx_job_applications_email ON job_applications(email);

-- Step 4: Enable Row Level Security
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage job applications" ON job_applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON job_applications;
DROP POLICY IF EXISTS "Service role full access" ON job_applications;

-- Step 6: Create policies
-- Allow service role (API) full access
CREATE POLICY "Service role full access" ON job_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Step 7: Grant permissions to service role
GRANT ALL ON job_applications TO service_role;
GRANT ALL ON job_applications TO authenticated;
GRANT INSERT ON job_applications TO anon;
GRANT SELECT ON job_applications TO anon;
