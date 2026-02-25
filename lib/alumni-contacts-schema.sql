-- Alumni Contacts Schema
-- Run this in your Supabase SQL Editor AFTER chapters-schema.sql
-- Supports future Linq texting integration (is_imessage, outreach_status)

-- =====================================================
-- OUTREACH STATUS ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE outreach_status AS ENUM (
    'not_contacted',
    'verified',
    'pitched',
    'signed_up',
    'wrong_number',
    'opted_out'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- ALUMNI CONTACTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS alumni_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_primary TEXT,       -- E.164 format, e.g. +15551234567
  phone_secondary TEXT,     -- Second phone (iMessage number, alt cell)
  email TEXT,
  year INTEGER,             -- Grad year or initiation year (age reference)
  outreach_status outreach_status NOT NULL DEFAULT 'not_contacted',
  is_imessage BOOLEAN DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT alumni_chapter_phone_primary_unique UNIQUE (chapter_id, phone_primary)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_alumni_contacts_chapter ON alumni_contacts(chapter_id);
CREATE INDEX IF NOT EXISTS idx_alumni_contacts_status ON alumni_contacts(outreach_status);
CREATE INDEX IF NOT EXISTS idx_alumni_contacts_phone_primary ON alumni_contacts(phone_primary);
CREATE INDEX IF NOT EXISTS idx_alumni_contacts_phone_secondary ON alumni_contacts(phone_secondary);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_alumni_contacts_updated_at ON alumni_contacts;
CREATE TRIGGER update_alumni_contacts_updated_at
  BEFORE UPDATE ON alumni_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS disabled — internal tool, no row-level restrictions needed
ALTER TABLE alumni_contacts DISABLE ROW LEVEL SECURITY;
