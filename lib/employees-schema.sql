-- Enhanced Employees Schema with Role-Based Access
-- Run this in your Supabase SQL Editor

-- Drop and recreate employees table
DROP TABLE IF EXISTS employee_tasks CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS personal_leads CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Info
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  
  -- Role & Permissions
  role TEXT DEFAULT 'growth_intern' CHECK (role IN (
    'founder', 'cofounder', 'growth_intern', 'engineer', 
    'sales_intern', 'marketing_intern', 'operations'
  )),
  seniority INTEGER DEFAULT 1 CHECK (seniority BETWEEN 1 AND 5),
  department TEXT,
  
  -- Status
  status TEXT DEFAULT 'onboarding' CHECK (status IN ('active', 'onboarding', 'inactive')),
  start_date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal Tasks for each employee
CREATE TABLE IF NOT EXISTS employee_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general', -- general, outreach, engineering, content
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal Leads (for Growth & Sales Interns)
CREATE TABLE IF NOT EXISTS personal_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Lead Info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  lead_type TEXT DEFAULT 'alumni' CHECK (lead_type IN ('alumni', 'chapter', 'sponsor', 'other')),
  
  -- Tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responding', 'meeting_set', 'converted', 'lost')),
  first_contact DATE,
  last_contact DATE,
  next_followup DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES employees(id),
  target_roles TEXT[] DEFAULT ARRAY['founder', 'cofounder', 'growth_intern', 'engineer', 'sales_intern', 'marketing_intern', 'operations'],
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engineering Tasks (for Engineers)
CREATE TABLE IF NOT EXISTS engineering_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'feature' CHECK (task_type IN ('feature', 'bug', 'improvement', 'tech_debt')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  assigned_to UUID REFERENCES employees(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee ON employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_personal_leads_employee ON personal_leads(employee_id);
CREATE INDEX IF NOT EXISTS idx_personal_leads_status ON personal_leads(status);
CREATE INDEX IF NOT EXISTS idx_engineering_tasks_assigned ON engineering_tasks(assigned_to);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
