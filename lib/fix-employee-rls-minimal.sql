-- Minimal Fix for Employee RLS Policy
-- Run this in your Supabase SQL Editor
-- This only fixes the employees table policy - the core issue

-- Step 1: Drop the existing policy that's blocking employee access
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;

-- Step 2: Create the fixed policy using auth.jwt() instead of subquery
-- This allows employees to view their own record by matching:
-- - Their auth user ID (auth_user_id column)
-- - OR their email from the JWT token
CREATE POLICY "Users can view own employee record" ON employees
  FOR SELECT USING (
    auth_user_id = auth.uid() OR 
    email = (auth.jwt() ->> 'email')
  );

-- That's it! The above should fix the login issue.

-- OPTIONAL: If you also want to fix the admin policies, run these:
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

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

-- Admins can manage (insert/update/delete) employees
CREATE POLICY "Admins can manage employees" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    ) OR
    (auth_user_id = auth.uid() AND role IN ('founder', 'cofounder'))
  );
