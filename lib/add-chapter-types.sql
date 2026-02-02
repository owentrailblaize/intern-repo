-- Migration: Add chapter_president and chapter_advisor contact types
-- Run this in your Supabase SQL Editor to update existing tables

-- Step 1: Drop the existing constraint
ALTER TABLE network_contacts 
  DROP CONSTRAINT IF EXISTS network_contacts_contact_type_check;

-- Step 2: Add the new constraint with expanded types
ALTER TABLE network_contacts 
  ADD CONSTRAINT network_contacts_contact_type_check 
  CHECK (contact_type IN (
    'investor', 'angel', 'vc', 
    'partnership', 'competitor',
    'connector', 'ifc_president', 'ifc_advisor', 
    'chapter_president', 'chapter_advisor',
    'greek_life', 'consultant', 'other'
  ));

-- Verify the migration
SELECT DISTINCT contact_type FROM network_contacts ORDER BY contact_type;
