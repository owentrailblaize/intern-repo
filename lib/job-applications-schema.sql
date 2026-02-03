-- Job Applications Schema
-- Run this in your Supabase SQL Editor

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Applicant Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Application Details
  position TEXT NOT NULL, -- 'growth_intern', 'sales_intern', 'marketing_intern', 'engineer'
  resume_url TEXT,
  cover_letter TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  
  -- Additional Questions
  why_trailblaize TEXT,
  experience TEXT,
  availability TEXT, -- When can they start?
  hours_per_week INTEGER,
  
  -- Review Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- New application, not reviewed
    'reviewing',    -- Currently being reviewed
    'interview',    -- Moved to interview stage
    'offered',      -- Offer extended
    'accepted',     -- Offer accepted
    'rejected',     -- Application rejected
    'withdrawn'     -- Applicant withdrew
  )),
  
  -- Review Notes
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  
  -- Source Tracking
  source TEXT DEFAULT 'website', -- 'website', 'linkedin', 'referral', 'other'
  referral_source TEXT, -- If referred, who referred them
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(position);
CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON job_applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Founders and admins can view and manage all applications
CREATE POLICY "Admins can manage job applications" ON job_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'cofounder')
    ) OR
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Allow public inserts for application submissions (no auth required)
CREATE POLICY "Anyone can submit applications" ON job_applications
  FOR INSERT WITH CHECK (true);
