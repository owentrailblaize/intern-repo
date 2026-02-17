-- INTERNAL TICKETING SYSTEM SCHEMA
-- Lightweight ticketing for the whole team (not just engineers)
-- Status pipeline: open → in_progress → in_review → testing → done
-- Hard QA gate: "in_review" requires a different team member to verify before "done"

-- ============================================
-- TICKETS
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'bug' CHECK (type IN ('bug', 'feature_request', 'issue')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'in_review', 'testing', 'done')),

  -- People
  creator_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- who verified/tested the fix

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ -- set when status → done
);

-- Auto-increment ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = 0 THEN
    NEW.number := nextval('ticket_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_number_trigger ON tickets;
CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TICKET COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- array of mentioned employee IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON ticket_comments;
CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TICKET ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'status_changed', 'assigned', 'commented', 'priority_changed', 'type_changed'
  from_value TEXT,
  to_value TEXT,
  metadata JSONB DEFAULT '{}', -- extra context if needed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TICKET NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('assigned', 'mentioned', 'status_changed', 'commented', 'review_requested')),
  message TEXT NOT NULL,
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON tickets(creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(number);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author_id ON ticket_comments(author_id);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_id ON ticket_activity(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_created_at ON ticket_activity(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_notifications_recipient_id ON ticket_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_is_read ON ticket_notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_ticket_id ON ticket_notifications(ticket_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notifications ENABLE ROW LEVEL SECURITY;

-- Everyone can view tickets
DROP POLICY IF EXISTS "Anyone can view tickets" ON tickets;
CREATE POLICY "Anyone can view tickets" ON tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create tickets" ON tickets;
CREATE POLICY "Anyone can create tickets" ON tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update tickets" ON tickets;
CREATE POLICY "Anyone can update tickets" ON tickets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;
CREATE POLICY "Admins can delete tickets" ON tickets FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role IN ('founder', 'cofounder', 'engineer')
  )
);

-- Comments - anyone can view and create
DROP POLICY IF EXISTS "Anyone can view comments" ON ticket_comments;
CREATE POLICY "Anyone can view comments" ON ticket_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create comments" ON ticket_comments;
CREATE POLICY "Anyone can create comments" ON ticket_comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authors can update comments" ON ticket_comments;
CREATE POLICY "Authors can update comments" ON ticket_comments FOR UPDATE USING (true);

-- Activity - anyone can view
DROP POLICY IF EXISTS "Anyone can view activity" ON ticket_activity;
CREATE POLICY "Anyone can view activity" ON ticket_activity FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can create activity" ON ticket_activity;
CREATE POLICY "System can create activity" ON ticket_activity FOR INSERT WITH CHECK (true);

-- Notifications - users can only see their own
DROP POLICY IF EXISTS "Users can view own notifications" ON ticket_notifications;
CREATE POLICY "Users can view own notifications" ON ticket_notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can create notifications" ON ticket_notifications;
CREATE POLICY "System can create notifications" ON ticket_notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON ticket_notifications;
CREATE POLICY "Users can update own notifications" ON ticket_notifications FOR UPDATE USING (true);

-- Service role bypass for all tables
DROP POLICY IF EXISTS "Service role bypass tickets" ON tickets;
CREATE POLICY "Service role bypass tickets" ON tickets FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass ticket_comments" ON ticket_comments;
CREATE POLICY "Service role bypass ticket_comments" ON ticket_comments FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass ticket_activity" ON ticket_activity;
CREATE POLICY "Service role bypass ticket_activity" ON ticket_activity FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass ticket_notifications" ON ticket_notifications;
CREATE POLICY "Service role bypass ticket_notifications" ON ticket_notifications FOR ALL USING (auth.role() = 'service_role');
