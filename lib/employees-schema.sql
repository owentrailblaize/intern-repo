-- Enhanced Employees Schema with Role-Based Access
-- Run this in your Supabase SQL Editor

-- Drop and recreate employees table
DROP TABLE IF EXISTS employee_tasks CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS personal_leads CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Auth Link (connects to Supabase Auth user)
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  
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

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_tasks ENABLE ROW LEVEL SECURITY;

-- EMPLOYEES TABLE POLICIES
-- Users can view their own employee record (by auth_user_id or email)
CREATE POLICY "Users can view own employee record" ON employees
  FOR SELECT USING (
    auth_user_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admins/Founders can view all employees
CREATE POLICY "Admins can view all employees" ON employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'cofounder')
    ) OR
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can manage employees
CREATE POLICY "Admins can manage employees" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'cofounder')
    ) OR
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- EMPLOYEE_TASKS POLICIES
-- Users can view/manage their own tasks
CREATE POLICY "Users can manage own tasks" ON employee_tasks
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE auth_user_id = auth.uid() OR 
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks" ON employee_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'cofounder')
    )
  );

-- PERSONAL_LEADS POLICIES
-- Users can manage their own leads
CREATE POLICY "Users can manage own leads" ON personal_leads
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE auth_user_id = auth.uid() OR 
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ANNOUNCEMENTS POLICIES
-- Everyone can view announcements targeted at their role
CREATE POLICY "Users can view targeted announcements" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE (auth_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()))
      AND role = ANY(target_roles)
    )
  );

-- Admins can manage announcements
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'cofounder')
    )
  );

-- ENGINEERING_TASKS POLICIES
-- Engineers and admins can view engineering tasks
CREATE POLICY "Engineers can view engineering tasks" ON engineering_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'cofounder', 'engineer')
    )
  );

-- Admins can manage engineering tasks
CREATE POLICY "Admins can manage engineering tasks" ON engineering_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'cofounder')
    )
  );
