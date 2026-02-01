-- SIMPLEST Fix for Employee Login Issue
-- Run this in your Supabase SQL Editor
-- Only 2 commands needed!

-- Step 1: Remove the broken policy
DROP POLICY IF EXISTS "Users can view own employee record" ON employees;

-- Step 2: Add the fixed policy
CREATE POLICY "Users can view own employee record" ON employees
  FOR SELECT USING (
    auth_user_id = auth.uid() OR 
    email = (auth.jwt() ->> 'email')
  );

-- Done! Try logging in now.
