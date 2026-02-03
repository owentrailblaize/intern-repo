-- Job Applications Table - COMPLETE SETUP
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Remove existing table
DROP TABLE IF EXISTS job_applications;

-- Step 2: Create table
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
  status TEXT DEFAULT 'pending',
  reviewer_id UUID,
  reviewer_notes TEXT,
  rating INTEGER,
  source TEXT DEFAULT 'website',
  referral_source TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: DISABLE Row Level Security (allows API access)
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;

-- Step 4: Create indexes for performance
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_email ON job_applications(email);

-- Done! The table is ready for use.
