-- Trailblaize Nucleus Database Schema
-- Run this in your Supabase SQL Editor

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'onboarding' CHECK (status IN ('active', 'onboarding', 'inactive')),
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Network Contacts Table (Enhanced Fundraising & Networking)
DROP TABLE IF EXISTS fundraising_contacts;
CREATE TABLE IF NOT EXISTS network_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  organization TEXT,
  phone TEXT,
  email TEXT,
  linkedin TEXT,
  
  -- Contact Type & Priority
  contact_type TEXT DEFAULT 'other' CHECK (contact_type IN (
    'investor', 'angel', 'vc', 
    'partnership', 'competitor',
    'connector', 'ifc_president', 'ifc_advisor', 
    'chapter_president', 'chapter_advisor',
    'greek_life', 'consultant', 'other'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('hot', 'warm', 'cold')),
  
  -- Relationship Stage
  stage TEXT DEFAULT 'identified' CHECK (stage IN (
    'identified', 'researching', 'outreach_pending',
    'first_contact', 'follow_up', 'in_conversation', 
    'meeting_scheduled', 'met', 'nurturing',
    'committed', 'passed', 'dormant'
  )),
  
  -- Tracking
  first_contact_date DATE,
  last_contact_date DATE,
  next_followup_date DATE,
  followup_count INTEGER DEFAULT 0,
  
  -- Value & Context
  potential_value TEXT,
  how_they_can_help TEXT,
  how_we_met TEXT,
  referred_by TEXT,
  
  -- Notes & Tags
  notes TEXT,
  tags TEXT[], -- Array for flexible tagging
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up Log Table (Track all touchpoints)
CREATE TABLE IF NOT EXISTS contact_followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES network_contacts(id) ON DELETE CASCADE,
  followup_type TEXT CHECK (followup_type IN ('email', 'call', 'meeting', 'text', 'linkedin', 'other')),
  summary TEXT,
  outcome TEXT,
  next_action TEXT,
  followup_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals (Sales Pipeline) Table
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  contact_name TEXT,
  fraternity TEXT,
  value DECIMAL(10,2) DEFAULT 0,
  stage TEXT DEFAULT 'discovery' CHECK (stage IN ('discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold')),
  expected_close DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add fraternity and temperature columns if they don't exist
-- ALTER TABLE deals ADD COLUMN IF NOT EXISTS fraternity TEXT;
-- ALTER TABLE deals ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold'));
-- UPDATE deals SET temperature = CASE WHEN probability >= 70 THEN 'hot' WHEN probability >= 30 THEN 'warm' ELSE 'cold' END WHERE temperature IS NULL;
-- ALTER TABLE deals DROP COLUMN IF EXISTS probability;

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  email TEXT,
  stage TEXT DEFAULT 'onboarding' CHECK (stage IN ('onboarding', 'active', 'at_risk', 'churned')),
  health TEXT DEFAULT 'good' CHECK (health IN ('good', 'warning', 'critical')),
  next_action TEXT,
  mrr DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enterprise Contracts Table
CREATE TABLE IF NOT EXISTS enterprise_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('ifc', 'national_org', 'partnership', 'other')),
  contact_name TEXT,
  contact_email TEXT,
  stage TEXT DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'negotiation', 'contract_sent', 'signed', 'lost')),
  value DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_network_contacts_type ON network_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_network_contacts_stage ON network_contacts(stage);
CREATE INDEX IF NOT EXISTS idx_network_contacts_priority ON network_contacts(priority);
CREATE INDEX IF NOT EXISTS idx_network_contacts_next_followup ON network_contacts(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_contact_followups_contact ON contact_followups(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
CREATE INDEX IF NOT EXISTS idx_enterprise_stage ON enterprise_contracts(stage);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for network_contacts
DROP TRIGGER IF EXISTS update_network_contacts_updated_at ON network_contacts;
CREATE TRIGGER update_network_contacts_updated_at
    BEFORE UPDATE ON network_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
