-- Onboarding System Schema
-- Run this in your Supabase SQL Editor

-- Add onboarding token to chapters table
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS onboarding_token TEXT UNIQUE;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS onboarding_token_created_at TIMESTAMPTZ;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS onboarding_submitted_at TIMESTAMPTZ;

-- Add check-in fields to chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS check_in_frequency TEXT DEFAULT 'biweekly' CHECK (check_in_frequency IN ('weekly', 'biweekly', 'monthly'));
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS last_check_in_date DATE;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS next_check_in_date DATE;

-- Add chapter details from onboarding form
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_designation TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS year_founded INTEGER;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS estimated_alumni INTEGER;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS instagram_photo_url TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS alumni_list_url TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS scheduled_demo_time TIMESTAMPTZ;

-- Create index for onboarding token lookups
CREATE INDEX IF NOT EXISTS idx_chapters_onboarding_token ON chapters(onboarding_token);

-- Chapter Executives table
CREATE TABLE IF NOT EXISTS chapter_executives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN (
    'president', 'vice_president', 'treasurer', 'secretary', 
    'alumni_relations', 'social_chair', 'recruitment_chair', 'other'
  )),
  custom_position TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapter_executives_chapter_id ON chapter_executives(chapter_id);

-- Outreach Channels table
CREATE TABLE IF NOT EXISTS chapter_outreach_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN (
    'email_newsletter', 'facebook_group', 'instagram', 'linkedin_group',
    'chapter_website', 'alumni_database', 'other'
  )),
  -- Email Newsletter fields
  email_platform TEXT,
  email_subscriber_count INTEGER,
  -- Facebook fields
  facebook_url TEXT,
  facebook_member_count INTEGER,
  -- Instagram fields
  instagram_handle TEXT,
  instagram_follower_count INTEGER,
  -- LinkedIn fields
  linkedin_url TEXT,
  linkedin_member_count INTEGER,
  -- Website
  website_url TEXT,
  -- General
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapter_outreach_channels_chapter_id ON chapter_outreach_channels(chapter_id);

-- Check-ins table
CREATE TABLE IF NOT EXISTS chapter_check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  health_score TEXT CHECK (health_score IN ('excellent', 'good', 'needs_attention', 'at_risk')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapter_check_ins_chapter_id ON chapter_check_ins(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_check_ins_date ON chapter_check_ins(check_in_date DESC);

-- Check-in Action Items table
CREATE TABLE IF NOT EXISTS check_in_action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_id UUID NOT NULL REFERENCES chapter_check_ins(id) ON DELETE CASCADE,
  action_item TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_in_action_items_check_in_id ON check_in_action_items(check_in_id);

-- Onboarding Submissions table (stores the raw form data)
CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_chapter_id ON onboarding_submissions(chapter_id);

-- Function to generate unique onboarding tokens
CREATE OR REPLACE FUNCTION generate_onboarding_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chapter_executives_updated_at ON chapter_executives;
CREATE TRIGGER update_chapter_executives_updated_at
    BEFORE UPDATE ON chapter_executives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chapter_outreach_channels_updated_at ON chapter_outreach_channels;
CREATE TRIGGER update_chapter_outreach_channels_updated_at
    BEFORE UPDATE ON chapter_outreach_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chapter_check_ins_updated_at ON chapter_check_ins;
CREATE TRIGGER update_chapter_check_ins_updated_at
    BEFORE UPDATE ON chapter_check_ins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next check-in date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_check_in_date(last_date DATE, frequency TEXT)
RETURNS DATE AS $$
BEGIN
  CASE frequency
    WHEN 'weekly' THEN RETURN last_date + INTERVAL '7 days';
    WHEN 'biweekly' THEN RETURN last_date + INTERVAL '14 days';
    WHEN 'monthly' THEN RETURN last_date + INTERVAL '1 month';
    ELSE RETURN last_date + INTERVAL '14 days';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (adjust based on your auth setup)
-- For now, allowing all operations for authenticated users

ALTER TABLE chapter_executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_outreach_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated" ON chapter_executives FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON chapter_outreach_channels FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON chapter_check_ins FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON check_in_action_items FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON onboarding_submissions FOR ALL USING (true);
