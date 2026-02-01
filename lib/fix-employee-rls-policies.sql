-- Fix Employee RLS Policies Migration
-- Run this in your Supabase SQL Editor to fix employee access issues
-- The issue: subqueries to auth.users don't work reliably in RLS policies
-- The fix: use auth.jwt() ->> 'email' to get current user's email directly from JWT

-- =====================================================
-- DROP EXISTING POLICIES (if they exist)
-- =====================================================

DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Users can manage own tasks" ON employee_tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON employee_tasks;
DROP POLICY IF EXISTS "Users can manage own leads" ON personal_leads;
DROP POLICY IF EXISTS "Users can view targeted announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Engineers can view engineering tasks" ON engineering_tasks;
DROP POLICY IF EXISTS "Admins can manage engineering tasks" ON engineering_tasks;

-- =====================================================
-- RECREATE FIXED POLICIES
-- =====================================================

-- EMPLOYEES TABLE POLICIES
-- Users can view their own employee record (by auth_user_id or email from JWT)
CREATE POLICY "Users can view own employee record" ON employees
  FOR SELECT USING (
    auth_user_id = auth.uid() OR 
    email = (auth.jwt() ->> 'email')
  );

-- Admins/Founders can view all employees
CREATE POLICY "Admins can view all employees" ON employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    (auth_user_id = auth.uid() AND role IN ('founder', 'cofounder'))
  );

-- Admins can manage employees
CREATE POLICY "Admins can manage employees" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    (auth_user_id = auth.uid() AND role IN ('founder', 'cofounder'))
  );

-- EMPLOYEE_TASKS POLICIES
-- Users can view/manage their own tasks
CREATE POLICY "Users can manage own tasks" ON employee_tasks
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE auth_user_id = auth.uid() OR 
      email = (auth.jwt() ->> 'email')
    )
  );

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks" ON employee_tasks
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

-- PERSONAL_LEADS POLICIES
-- Users can manage their own leads
CREATE POLICY "Users can manage own leads" ON personal_leads
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE auth_user_id = auth.uid() OR 
      email = (auth.jwt() ->> 'email')
    )
  );

-- ANNOUNCEMENTS POLICIES
-- Everyone can view announcements targeted at their role
CREATE POLICY "Users can view targeted announcements" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE (auth_user_id = auth.uid() OR email = (auth.jwt() ->> 'email'))
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
    ) OR
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
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
    ) OR
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can manage engineering tasks
CREATE POLICY "Admins can manage engineering tasks" ON engineering_tasks
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

-- =====================================================
-- VERIFY EMPLOYEE DATA INTEGRITY
-- =====================================================

-- This query helps verify that employees are properly linked to auth users
-- Run this SELECT to see the status of employee-auth linkage:
-- SELECT 
--   e.id,
--   e.name,
--   e.email,
--   e.auth_user_id,
--   CASE WHEN au.id IS NOT NULL THEN 'Linked' ELSE 'Not Linked' END as auth_status
-- FROM employees e
-- LEFT JOIN auth.users au ON e.auth_user_id = au.id
-- ORDER BY e.created_at DESC;
