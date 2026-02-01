-- Enhanced Employees Schema with Role-Based Access
-- Run this in your Supabase SQL Editor

-- Drop and recreate employees table
DROP TABLE IF EXISTS employees;

CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Info
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  
  -- Role & Permissions
  role TEXT DEFAULT 'intern' CHECK (role IN (
    'intern', 'member', 'lead', 'manager', 'director', 'cofounder', 'founder'
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

-- Employee Tasks (personal tasks for workspace)
CREATE TABLE IF NOT EXISTS employee_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Announcements (visible to all based on role)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES employees(id),
  min_role TEXT DEFAULT 'intern', -- Minimum role to see this
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee ON employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON employee_tasks(status);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(pinned);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
