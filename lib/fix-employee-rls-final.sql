-- FINAL FIX for Employee RLS Policies
-- Run this in your Supabase SQL Editor
--
-- THE PROBLEM: 
-- 1. Circular dependency in RLS policies (querying employees table to check role)
-- 2. Only specific hardcoded emails could access the system
--
-- THE FIX: 
-- 1. Use JWT user_metadata for admin role checks (no circular dependency)
-- 2. Allow ANY authenticated employee to view their own record
-- 3. Founders/Cofounders can view/manage all employees

-- =====================================================
-- STEP 1: DROP ALL EXISTING EMPLOYEE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own employee record" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Founders can view all employees" ON employees;
DROP POLICY IF EXISTS "Founders can manage all employees" ON employees;
DROP POLICY IF EXISTS "Anyone can read employees" ON employees;
DROP POLICY IF EXISTS "Service role can manage employees" ON employees;
DROP POLICY IF EXISTS "Admin emails can view all employees" ON employees;
DROP POLICY IF EXISTS "Admin emails can manage all employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

-- =====================================================
-- STEP 2: CREATE NEW POLICIES
-- =====================================================

-- Policy 1: ANY authenticated user can view their OWN employee record
-- This is the KEY fix - allows login to work for any employee
-- Matches by auth_user_id (primary) OR email (fallback)
CREATE POLICY "Employees can view own record" ON employees
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      auth_user_id = auth.uid() OR 
      email = (auth.jwt() ->> 'email')
    )
  );

-- Policy 2: Founders/Cofounders can view ALL employees
-- Uses user_metadata from JWT (set when user was created via API)
CREATE POLICY "Founders can view all employees" ON employees
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder')
  );

-- Policy 3: Founders/Cofounders can INSERT/UPDATE/DELETE all employees  
CREATE POLICY "Founders can manage all employees" ON employees
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder')
  );

-- Policy 4: Users can update their own basic profile info
CREATE POLICY "Employees can update own record" ON employees
  FOR UPDATE USING (
    auth_user_id = auth.uid() OR 
    email = (auth.jwt() ->> 'email')
  )
  WITH CHECK (
    auth_user_id = auth.uid() OR 
    email = (auth.jwt() ->> 'email')
  );

-- =====================================================
-- STEP 3: FIX RELATED TABLE POLICIES
-- =====================================================

-- EMPLOYEE_TASKS
DROP POLICY IF EXISTS "Users can manage own tasks" ON employee_tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON employee_tasks;
DROP POLICY IF EXISTS "Founders can view all tasks" ON employee_tasks;
DROP POLICY IF EXISTS "Employees can manage own tasks" ON employee_tasks;
DROP POLICY IF EXISTS "Founders can manage all tasks" ON employee_tasks;

CREATE POLICY "Employees can manage own tasks" ON employee_tasks
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE auth_user_id = auth.uid() OR 
      email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Founders can manage all tasks" ON employee_tasks
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder')
  );

-- PERSONAL_LEADS
DROP POLICY IF EXISTS "Users can manage own leads" ON personal_leads;
DROP POLICY IF EXISTS "Founders can view all leads" ON personal_leads;
DROP POLICY IF EXISTS "Employees can manage own leads" ON personal_leads;
DROP POLICY IF EXISTS "Founders can manage all leads" ON personal_leads;

CREATE POLICY "Employees can manage own leads" ON personal_leads
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE auth_user_id = auth.uid() OR 
      email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Founders can manage all leads" ON personal_leads
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder')
  );

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "Users can view targeted announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Founders can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Employees can view announcements" ON announcements;

CREATE POLICY "Employees can view announcements" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE (auth_user_id = auth.uid() OR email = (auth.jwt() ->> 'email'))
      AND role = ANY(target_roles)
    )
  );

CREATE POLICY "Founders can manage announcements" ON announcements
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder')
  );

-- ENGINEERING_TASKS
DROP POLICY IF EXISTS "Engineers can view engineering tasks" ON engineering_tasks;
DROP POLICY IF EXISTS "Admins can manage engineering tasks" ON engineering_tasks;
DROP POLICY IF EXISTS "Founders can manage engineering tasks" ON engineering_tasks;

CREATE POLICY "Engineers can view engineering tasks" ON engineering_tasks
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder', 'engineer')
  );

CREATE POLICY "Founders can manage engineering tasks" ON engineering_tasks
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder')
  );

-- =====================================================
-- STEP 4: (OPTIONAL) UPDATE EXISTING USERS' METADATA
-- =====================================================

-- If you have existing users who don't have role in their metadata,
-- you can update them using the Supabase Auth Admin API or Dashboard.
-- 
-- Go to Authentication > Users > Click on user > Edit user metadata
-- Add: { "role": "founder" } or whatever their role is
--
-- For new users created via the API, the role is automatically set
-- in user_metadata when the account is created.

-- =====================================================
-- VERIFICATION QUERIES (run these to check status)
-- =====================================================

-- Check if employees table has RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'employees';

-- List all policies on employees table:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'employees';

-- Check employee-auth linkage:
-- SELECT id, name, email, role, auth_user_id FROM employees ORDER BY created_at DESC;
