-- SIMPLE RLS FIX FOR INTERNAL CRM
-- This is an internal tool - any authenticated user should be able to read employees
-- Run this in Supabase SQL Editor

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
DROP POLICY IF EXISTS "Employees can update own record" ON employees;
DROP POLICY IF EXISTS "Authenticated users can read employees" ON employees;
DROP POLICY IF EXISTS "Founders can manage employees" ON employees;

-- =====================================================
-- STEP 2: CREATE SIMPLE POLICIES
-- =====================================================

-- ANY authenticated user can read ANY employee record
-- This is fine for an internal CRM - we want employees to see each other
CREATE POLICY "Authenticated users can read employees" ON employees
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only founders/cofounders can INSERT, UPDATE, DELETE
-- Check role from user_metadata in JWT (set when user created)
CREATE POLICY "Founders can manage employees" ON employees
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('founder', 'cofounder')
  );

-- =====================================================
-- STEP 3: LINK YOUR AUTH USER TO EMPLOYEE RECORD
-- =====================================================

-- Update Owen's employee record with auth_user_id
UPDATE employees 
SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'owen@trailblaize.net')
WHERE email = 'owen@trailblaize.net' AND auth_user_id IS NULL;

-- Update auth metadata for Owen
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "founder"}'::jsonb
WHERE email = 'owen@trailblaize.net';

-- Do the same for other founders
UPDATE employees 
SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'bigovintage1@gmail.com')
WHERE email = 'bigovintage1@gmail.com' AND auth_user_id IS NULL;

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "cofounder"}'::jsonb
WHERE email = 'bigovintage1@gmail.com';

-- =====================================================
-- STEP 4: VERIFY
-- =====================================================

-- Check policies
SELECT policyname, cmd, qual::text FROM pg_policies WHERE tablename = 'employees';

-- Check employee records
SELECT id, name, email, role, auth_user_id FROM employees;
