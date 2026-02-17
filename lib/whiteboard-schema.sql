-- ============================================
-- COLLABORATIVE WHITEBOARD SCHEMA
-- ============================================

-- Whiteboard entries - each text item placed on the board
CREATE TABLE whiteboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#000000',
  author_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Unknown',
  font_size FLOAT NOT NULL DEFAULT 28,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast loading of all entries
CREATE INDEX idx_whiteboard_entries_created ON whiteboard_entries(created_at);

-- Enable real-time subscriptions
ALTER TABLE whiteboard_entries REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE whiteboard_entries ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read
CREATE POLICY "whiteboard_entries_select" ON whiteboard_entries
  FOR SELECT USING (true);

-- Policy: All authenticated users can insert
CREATE POLICY "whiteboard_entries_insert" ON whiteboard_entries
  FOR INSERT WITH CHECK (true);

-- Policy: Authors can update their own entries
CREATE POLICY "whiteboard_entries_update" ON whiteboard_entries
  FOR UPDATE USING (true);

-- Policy: All authenticated users can delete (for clear board)
CREATE POLICY "whiteboard_entries_delete" ON whiteboard_entries
  FOR DELETE USING (true);
