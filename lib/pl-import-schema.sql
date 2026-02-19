-- P&L Import Schema: extends expenses table + adds import_batches
-- Run this in your Supabase SQL Editor AFTER accounting-schema.sql

-- =====================================================
-- EXTEND EXPENSES TABLE
-- =====================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense' CHECK (type IN ('revenue', 'expense'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS import_batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_import_batch ON expenses(import_batch_id);

-- =====================================================
-- IMPORT BATCHES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  filename TEXT,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_expenses DECIMAL(10,2) DEFAULT 0,
  line_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_period ON import_batches(year, month);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read import_batches" ON import_batches;
DROP POLICY IF EXISTS "Authenticated users can insert import_batches" ON import_batches;
DROP POLICY IF EXISTS "Authenticated users can update import_batches" ON import_batches;
DROP POLICY IF EXISTS "Authenticated users can delete import_batches" ON import_batches;

CREATE POLICY "Authenticated users can read import_batches" ON import_batches
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert import_batches" ON import_batches
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update import_batches" ON import_batches
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete import_batches" ON import_batches
  FOR DELETE USING (auth.uid() IS NOT NULL);
