-- iMessage Outreach Distribution System Schema
-- Run in Supabase SQL Editor AFTER alumni-contacts-schema.sql

-- =====================================================
-- MIGRATE phone -> phone_primary, add phone_secondary
-- =====================================================

ALTER TABLE alumni_contacts RENAME COLUMN phone TO phone_primary;
ALTER TABLE alumni_contacts ADD COLUMN IF NOT EXISTS phone_secondary TEXT;

-- Update unique constraint to use new column name
ALTER TABLE alumni_contacts DROP CONSTRAINT IF EXISTS alumni_chapter_phone_unique;
ALTER TABLE alumni_contacts ADD CONSTRAINT alumni_chapter_phone_primary_unique UNIQUE (chapter_id, phone_primary);

DROP INDEX IF EXISTS idx_alumni_contacts_phone;
CREATE INDEX IF NOT EXISTS idx_alumni_contacts_phone_primary ON alumni_contacts(phone_primary);
CREATE INDEX IF NOT EXISTS idx_alumni_contacts_phone_secondary ON alumni_contacts(phone_secondary);

-- =====================================================
-- SENDING LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS sending_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  label TEXT NOT NULL,             -- "Line 1", "Owen's iPhone", etc.
  phone_number TEXT NOT NULL,      -- E.164
  daily_limit INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sending_lines_chapter ON sending_lines(chapter_id);
ALTER TABLE sending_lines DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_sending_lines_updated_at ON sending_lines;
CREATE TRIGGER update_sending_lines_updated_at
  BEFORE UPDATE ON sending_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CAMPAIGN STATUS ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CAMPAIGNS
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  message_template TEXT NOT NULL,         -- supports {{first_name}}, {{chapter_name}}, {{year}}
  use_secondary_phone BOOLEAN NOT NULL DEFAULT false,
  status campaign_status NOT NULL DEFAULT 'draft',
  total_contacts INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_chapter ON outreach_campaigns(chapter_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON outreach_campaigns(status);
ALTER TABLE outreach_campaigns DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON outreach_campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON outreach_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ASSIGNMENT STATUS ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('queued', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CAMPAIGN ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES alumni_contacts(id) ON DELETE CASCADE,
  line_id UUID NOT NULL REFERENCES sending_lines(id) ON DELETE CASCADE,

  send_phone TEXT NOT NULL,               -- resolved phone to text (primary or secondary)
  queue_position INTEGER NOT NULL,        -- position within this line's queue (1-based)
  scheduled_day INTEGER NOT NULL,         -- which day of the campaign (1-based)
  status assignment_status NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_campaign ON campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_assignments_line ON campaign_assignments(line_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON campaign_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_day ON campaign_assignments(campaign_id, line_id, scheduled_day);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_campaign_contact ON campaign_assignments(campaign_id, contact_id);
ALTER TABLE campaign_assignments DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- LINE PAUSE STATE (per-campaign)
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_line_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  line_id UUID NOT NULL REFERENCES sending_lines(id) ON DELETE CASCADE,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  contacts_assigned INTEGER NOT NULL DEFAULT 0,

  UNIQUE (campaign_id, line_id)
);

ALTER TABLE campaign_line_states DISABLE ROW LEVEL SECURITY;
