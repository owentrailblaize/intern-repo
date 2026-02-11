-- Chapters / Customer Success Schema
-- Run this in your Supabase SQL Editor

-- Drop old customers table and create new chapters table
DROP TABLE IF EXISTS customers;

CREATE TABLE IF NOT EXISTS chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Info
  chapter_name TEXT NOT NULL,
  school TEXT,
  fraternity TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Status & Health
  status TEXT DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'at_risk', 'churned')),
  health TEXT DEFAULT 'good' CHECK (health IN ('good', 'warning', 'critical')),
  mrr DECIMAL(10,2) DEFAULT 0,
  
  -- Onboarding Checklist (matching your Google Sheet)
  chapter_created BOOLEAN DEFAULT false,
  exec_account BOOLEAN DEFAULT false,
  scheduled_first_call BOOLEAN DEFAULT false,
  exec_demo BOOLEAN DEFAULT false,
  alumni_list BOOLEAN DEFAULT false,
  alumni_emails_sent BOOLEAN DEFAULT false,
  member_onboarding BOOLEAN DEFAULT false,
  budget_set BOOLEAN DEFAULT false,
  qr_code BOOLEAN DEFAULT false,
  simple_function_guide BOOLEAN DEFAULT false,
  events_scheduled BOOLEAN DEFAULT false,
  test_announcements BOOLEAN DEFAULT false,
  message_board_started BOOLEAN DEFAULT false,
  invitations_created BOOLEAN DEFAULT false,
  facebook_group BOOLEAN DEFAULT false,
  linkedin_group BOOLEAN DEFAULT false,
  instagram_post BOOLEAN DEFAULT false,
  
  -- Tracking
  onboarding_started DATE DEFAULT CURRENT_DATE,
  onboarding_completed DATE,
  last_activity DATE,
  next_action TEXT,
  notes TEXT,
  alumni_channels TEXT,  -- Communication channels used with alumni (e.g., GroupMe, Slack, email)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);
CREATE INDEX IF NOT EXISTS idx_chapters_health ON chapters(health);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_chapters_updated_at ON chapters;
CREATE TRIGGER update_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
