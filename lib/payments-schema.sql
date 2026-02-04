-- Payment Transactions Schema
-- Run this in your Supabase SQL Editor to add payment tracking

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationship
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('card', 'bank_transfer', 'check', 'cash', 'other')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Reference Info
  reference_number TEXT,
  notes TEXT,
  
  -- Period covered
  period_start DATE,
  period_end DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_chapter_id ON payments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (adjust based on your auth setup)
-- Drop existing policy first to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;
CREATE POLICY "Enable all access for authenticated users" ON payments
  FOR ALL USING (true);
