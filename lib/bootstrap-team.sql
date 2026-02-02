-- BOOTSTRAP TEAM ACCOUNTS
-- Run this AFTER running fix-employee-rls-final.sql
-- Creates Co-Founder accounts for Ford and Adam, and Engineer account for Devin

-- =====================================================
-- FORD - CO-FOUNDER
-- =====================================================
-- Delete existing record if any
DELETE FROM employees WHERE email = 'ford@trailblaize.net';

-- Insert Ford
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
  'Ford' as name,
  'ford@trailblaize.net' as email,
  'cofounder' as role,
  5 as seniority,
  'Leadership' as department,
  'active' as status,
  CURRENT_DATE as start_date
FROM auth.users
WHERE email = 'ford@trailblaize.net';

-- Update Ford's auth user metadata
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "cofounder", "name": "Ford"}'::jsonb
WHERE email = 'ford@trailblaize.net';

-- =====================================================
-- ADAM - CO-FOUNDER
-- =====================================================
-- Delete existing record if any
DELETE FROM employees WHERE email = 'adam@trailblaize.net';

-- Insert Adam
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
  'Adam' as name,
  'adam@trailblaize.net' as email,
  'cofounder' as role,
  5 as seniority,
  'Leadership' as department,
  'active' as status,
  CURRENT_DATE as start_date
FROM auth.users
WHERE email = 'adam@trailblaize.net';

-- Update Adam's auth user metadata
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "cofounder", "name": "Adam"}'::jsonb
WHERE email = 'adam@trailblaize.net';

-- =====================================================
-- DEVIN - ENGINEER
-- =====================================================
-- Delete existing record if any
DELETE FROM employees WHERE email = 'devin@trailblaize.net';

-- Insert Devin
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
  'Devin' as name,
  'devin@trailblaize.net' as email,
  'engineer' as role,
  3 as seniority,
  'Engineering' as department,
  'active' as status,
  CURRENT_DATE as start_date
FROM auth.users
WHERE email = 'devin@trailblaize.net';

-- Update Devin's auth user metadata
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "engineer", "name": "Devin"}'::jsonb
WHERE email = 'devin@trailblaize.net';

-- =====================================================
-- VERIFY ACCOUNTS CREATED
-- =====================================================
SELECT id, name, email, role, department, seniority, status 
FROM employees 
WHERE email IN ('ford@trailblaize.net', 'adam@trailblaize.net', 'devin@trailblaize.net')
ORDER BY role, name;
