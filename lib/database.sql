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

-- Fundraising Contacts Table
CREATE TABLE IF NOT EXISTS fundraising_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  firm TEXT,
  email TEXT,
  stage TEXT DEFAULT 'outreach' CHECK (stage IN ('outreach', 'meeting_set', 'in_conversation', 'committed', 'passed')),
  notes TEXT,
  last_contact DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals (Sales Pipeline) Table
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  contact_name TEXT,
  value DECIMAL(10,2) DEFAULT 0,
  stage TEXT DEFAULT 'discovery' CHECK (stage IN ('discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  probability INTEGER DEFAULT 0,
  expected_close DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fundraising_contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE enterprise_contracts ENABLE ROW LEVEL SECURITY;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
CREATE INDEX IF NOT EXISTS idx_enterprise_stage ON enterprise_contracts(stage);
