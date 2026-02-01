-- BOOTSTRAP FOUNDER ACCOUNT
-- Run this AFTER running fix-employee-rls-final.sql
-- This creates the founder employee record for owen@trailblaize.net

-- Step 1: Get the auth user ID for owen@trailblaize.net
-- and insert into employees table with founder role

INSERT INTO employees (
  auth_user_id,
  name,
  email,
  role,
  seniority,
  department,
  status,
  start_date
)
SELECT 
  id as auth_user_id,
  'Owen Ridgeway' as name,
  email,
  'founder' as role,
  5 as seniority,
  'Leadership' as department,
  'active' as status,
  CURRENT_DATE as start_date
FROM auth.users
WHERE email = 'owen@trailblaize.net'
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  role = 'founder',
  seniority = 5,
  status = 'active';

-- Step 2: Update the auth user's metadata to include the role
-- This ensures RLS policies work correctly
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "founder", "name": "Owen Ridgeway"}'::jsonb
WHERE email = 'owen@trailblaize.net';

-- Verify the employee was created
SELECT id, name, email, role, auth_user_id FROM employees WHERE email = 'owen@trailblaize.net';
