-- Outreach Queue System (Simplified)
-- Run in Supabase SQL Editor AFTER alumni-contacts-schema.sql
-- Replaces the campaign-based system with automatic line assignment

-- =====================================================
-- DROP OLD CAMPAIGN TABLES (from previous migration)
-- =====================================================

DROP TABLE IF EXISTS campaign_line_states CASCADE;
DROP TABLE IF EXISTS campaign_assignments CASCADE;
DROP TABLE IF EXISTS outreach_campaigns CASCADE;
DROP TABLE IF EXISTS sending_lines CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS assignment_status CASCADE;

-- =====================================================
-- OUTREACH QUEUE
-- =====================================================
-- Each alumni contact with a phone gets auto-assigned to a
-- sending line with a queue position. No manual campaign step.

CREATE TABLE IF NOT EXISTS outreach_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES alumni_contacts(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number >= 1),
  queue_position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (chapter_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_outreach_queue_chapter ON outreach_queue(chapter_id);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_line ON outreach_queue(chapter_id, line_number);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_status ON outreach_queue(chapter_id, status);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_position ON outreach_queue(chapter_id, line_number, queue_position);

ALTER TABLE outreach_queue DISABLE ROW LEVEL SECURITY;
