-- Add Alumni Communication Channels to Chapters
-- Run this in your Supabase SQL Editor

-- Add the alumni_channels column to track how chapters communicate with alumni
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS alumni_channels TEXT;

-- Add comment for documentation
COMMENT ON COLUMN chapters.alumni_channels IS 'Notes about communication channels used with alumni (e.g., GroupMe, Slack, email newsletter, text chain)';
