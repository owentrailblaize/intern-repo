/* Chapter Payment Tracking Schema */
/* Run this in your Supabase SQL Editor to add payment tracking to chapters */

ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 31),
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'annual' CHECK (payment_type IN ('monthly', 'one_time', 'annual')),
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 299.00,
ADD COLUMN IF NOT EXISTS payment_start_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS next_payment_date DATE;

CREATE INDEX IF NOT EXISTS idx_chapters_payment_day ON chapters(payment_day);
CREATE INDEX IF NOT EXISTS idx_chapters_next_payment_date ON chapters(next_payment_date);

COMMENT ON COLUMN chapters.payment_day IS 'Day of month when subscription payment is due (1-31)';
COMMENT ON COLUMN chapters.payment_type IS 'Type of payment: monthly, one_time, or annual commitment';
COMMENT ON COLUMN chapters.payment_amount IS 'Payment amount per billing cycle (default $299 for pilot)';
COMMENT ON COLUMN chapters.payment_start_date IS 'Date when the subscription started';
COMMENT ON COLUMN chapters.last_payment_date IS 'Date of the most recent payment received';
COMMENT ON COLUMN chapters.next_payment_date IS 'Date of the next expected payment';
