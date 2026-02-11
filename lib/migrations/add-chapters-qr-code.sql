-- Add QR Code checkbox to customer success onboarding (Members section)
-- Run on existing DBs that already have the chapters table.
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS qr_code BOOLEAN DEFAULT false;
