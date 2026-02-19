-- Accounting Schema: Expenses + Monthly Statements
-- Run this in your Supabase SQL Editor

-- =====================================================
-- EXPENSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT CHECK (category IN ('software', 'travel', 'legal', 'marketing', 'payroll', 'office', 'other')),
  vendor TEXT,
  description TEXT,
  payment_method TEXT CHECK (payment_method IN ('brex', 'personal', 'wire', 'other')),
  receipt_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON expenses;

CREATE POLICY "Authenticated users can read expenses" ON expenses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update expenses" ON expenses
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete expenses" ON expenses
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- MONTHLY STATEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS monthly_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  notes TEXT,
  attachment_url TEXT,
  attachment_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_statements_period ON monthly_statements(year, month);

DROP TRIGGER IF EXISTS update_monthly_statements_updated_at ON monthly_statements;
CREATE TRIGGER update_monthly_statements_updated_at
    BEFORE UPDATE ON monthly_statements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE monthly_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read monthly_statements" ON monthly_statements;
DROP POLICY IF EXISTS "Authenticated users can insert monthly_statements" ON monthly_statements;
DROP POLICY IF EXISTS "Authenticated users can update monthly_statements" ON monthly_statements;
DROP POLICY IF EXISTS "Authenticated users can delete monthly_statements" ON monthly_statements;

CREATE POLICY "Authenticated users can read monthly_statements" ON monthly_statements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert monthly_statements" ON monthly_statements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update monthly_statements" ON monthly_statements
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete monthly_statements" ON monthly_statements
  FOR DELETE USING (auth.uid() IS NOT NULL);
