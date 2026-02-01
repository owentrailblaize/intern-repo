-- DEBUG AND FIX EMPLOYEE ACCESS
-- Run each section separately to diagnose the issue

-- ============================================
-- STEP 1: Check what employees exist
-- ============================================
SELECT id, name, email, auth_user_id, role, status 
FROM employees 
ORDER BY created_at DESC;

-- ============================================
-- STEP 2: Check what auth users exist
-- ============================================
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- ============================================
-- STEP 3: Link auth_user_id for existing employees
-- This updates employees to link their auth accounts
-- ============================================
UPDATE employees e
SET auth_user_id = au.id
FROM auth.users au
WHERE e.email = au.email
AND e.auth_user_id IS NULL;

-- ============================================
-- STEP 4: Verify the link worked
-- ============================================
SELECT 
  e.id as employee_id,
  e.name,
  e.email,
  e.auth_user_id,
  e.role,
  CASE WHEN au.id IS NOT NULL THEN '✅ Linked' ELSE '❌ Not Linked' END as auth_status
FROM employees e
LEFT JOIN auth.users au ON e.auth_user_id = au.id
ORDER BY e.created_at DESC;

-- ============================================
-- STEP 5: If ford@trailblaize.net has NO employee record, create one:
-- (Only run this if Step 1 shows no record for ford@trailblaize.net)
-- ============================================
-- INSERT INTO employees (name, email, role, status, auth_user_id)
-- SELECT 
--   COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
--   email,
--   'growth_intern',
--   'active',
--   id
-- FROM auth.users
-- WHERE email = 'ford@trailblaize.net';

-- ============================================
-- STEP 6: Verify RLS policy exists
-- ============================================
SELECT polname, polcmd, polroles, polqual 
FROM pg_policy 
WHERE polrelid = 'employees'::regclass;
