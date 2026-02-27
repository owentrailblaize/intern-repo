-- Add Linq integration and outreach tracking fields to alumni_contacts
ALTER TABLE alumni_contacts
  ADD COLUMN IF NOT EXISTS linq_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS assigned_line INTEGER,
  ADD COLUMN IF NOT EXISTS touch1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS touch2_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS touch3_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_text TEXT,
  ADD COLUMN IF NOT EXISTS response_classification TEXT CHECK (
    response_classification IN ('confirmed', 'wrong_number', 'question', 'declined', 'no_response', 'signed_up')
  );

-- Index for efficient outreach queries
CREATE INDEX IF NOT EXISTS idx_alumni_outreach_status ON alumni_contacts(chapter_id, outreach_status, is_imessage);
CREATE INDEX IF NOT EXISTS idx_alumni_linq_chat ON alumni_contacts(linq_chat_id) WHERE linq_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alumni_touch_cadence ON alumni_contacts(chapter_id, is_imessage, touch1_sent_at, touch2_sent_at, touch3_sent_at);
