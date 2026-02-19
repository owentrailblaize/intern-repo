-- Fix RLS Policies for Payments Table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Problem: "new row violates row-level security policy for table payments"
-- The payments table has RLS enabled but is missing proper INSERT/UPDATE/DELETE
-- policies with WITH CHECK clauses.

-- =====================================================
-- STEP 1: DROP ALL EXISTING PAYMENT POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Authenticated users can read payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;

-- =====================================================
-- STEP 2: ENSURE RLS IS ENABLED
-- =====================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: CREATE EXPLICIT POLICIES FOR EACH OPERATION
-- =====================================================

-- SELECT: Any authenticated user can view payment records
CREATE POLICY "Authenticated users can read payments" ON payments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: Any authenticated user can record new payments
CREATE POLICY "Authenticated users can insert payments" ON payments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Any authenticated user can edit payments
CREATE POLICY "Authenticated users can update payments" ON payments
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: Any authenticated user can delete/reverse payments
CREATE POLICY "Authenticated users can delete payments" ON payments
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- STEP 4: VERIFY POLICIES
-- =====================================================

SELECT policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE tablename = 'payments';
