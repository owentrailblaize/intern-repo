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
  phone TEXT,          -- E.164 format, e.g. +15551234567
  email TEXT,
  year INTEGER,        -- Grad year or initiation year (age reference)
  outreach_status outreach_status NOT NULL DEFAULT 'not_contacted',
  is_imessage BOOLEAN DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT alumni_chapter_phone_unique UNIQUE (chapter_id, phone)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_alumni_contacts_chapter ON alumni_contacts(chapter_id);
CREATE INDEX IF NOT EXISTS idx_alumni_contacts_status ON alumni_contacts(outreach_status);
CREATE INDEX IF NOT EXISTS idx_alumni_contacts_phone ON alumni_contacts(phone);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_alumni_contacts_updated_at ON alumni_contacts;
CREATE TRIGGER update_alumni_contacts_updated_at
  BEFORE UPDATE ON alumni_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE alumni_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read alumni_contacts" ON alumni_contacts;
DROP POLICY IF EXISTS "Authenticated users can insert alumni_contacts" ON alumni_contacts;
DROP POLICY IF EXISTS "Authenticated users can update alumni_contacts" ON alumni_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete alumni_contacts" ON alumni_contacts;

CREATE POLICY "Authenticated users can read alumni_contacts" ON alumni_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert alumni_contacts" ON alumni_contacts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update alumni_contacts" ON alumni_contacts
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete alumni_contacts" ON alumni_contacts
  FOR DELETE USING (auth.uid() IS NOT NULL);
