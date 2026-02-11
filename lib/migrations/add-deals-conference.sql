-- Add conference column for pipeline family tree (run on existing DBs)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS conference TEXT;
