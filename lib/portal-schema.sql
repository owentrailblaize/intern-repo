-- Employee Portal Schema
-- Personal workspace tables for all employees

-- =====================================================
-- INBOX MESSAGES (Gmail-style internal messaging)
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Sender & Recipient
  sender_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Thread tracking (for conversations)
  thread_id UUID,
  parent_message_id UUID REFERENCES portal_messages(id) ON DELETE SET NULL,
  
  -- Message content
  subject TEXT NOT NULL,
  body TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,
  
  -- Labels/Tags
  labels TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PERSONAL PROJECTS (What I'm working on)
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Project info
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  
  -- Status & Progress
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  
  -- Deadlines
  due_date DATE,
  started_at DATE DEFAULT CURRENT_DATE,
  completed_at DATE,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PERSONAL NOTES (Quick notes & reminders)
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Note content
  title TEXT,
  content TEXT NOT NULL,
  
  -- Organization
  color TEXT DEFAULT '#fef3c7',
  pinned BOOLEAN DEFAULT false,
  
  -- Optional project link
  project_id UUID REFERENCES portal_projects(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FOCUS TIME / DAILY GOALS
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_daily_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Goal
  goal_date DATE DEFAULT CURRENT_DATE,
  goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  completed_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Reflection
  daily_reflection TEXT,
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'rough')),
  
  -- Focus time tracking (in minutes)
  planned_focus_minutes INTEGER DEFAULT 240,
  actual_focus_minutes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(employee_id, goal_date)
);

-- =====================================================
-- QUICK LINKS (Personal bookmarks)
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_quick_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'link',
  color TEXT DEFAULT '#6b7280',
  
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACTIVITY LOG (Personal activity feed)
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Activity type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'task_completed', 'task_created', 'lead_converted', 'lead_contacted',
    'message_sent', 'message_received', 'project_created', 'project_completed',
    'goal_achieved', 'note_created', 'mention', 'assignment', 'other'
  )),
  
  -- Details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Reference to related item
  reference_type TEXT,
  reference_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EXTERNAL EMAIL SYNC (Gmail Integration tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_email_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  
  -- OAuth tokens (encrypted in production)
  email_address TEXT NOT NULL,
  provider TEXT DEFAULT 'gmail' CHECK (provider IN ('gmail', 'outlook', 'other')),
  
  -- Sync settings
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  
  -- Token storage (would be encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SYNCED EMAILS (Cached external emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS portal_external_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES portal_email_accounts(id) ON DELETE CASCADE,
  
  -- Email identifiers from provider
  external_id TEXT NOT NULL,
  thread_id TEXT,
  
  -- Email content
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[],
  cc_emails TEXT[],
  subject TEXT,
  snippet TEXT,
  body_preview TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  labels TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  email_date TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(email_account_id, external_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_portal_messages_recipient ON portal_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_thread ON portal_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_unread ON portal_messages(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_portal_projects_owner ON portal_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_portal_notes_employee ON portal_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_portal_daily_goals_date ON portal_daily_goals(employee_id, goal_date);
CREATE INDEX IF NOT EXISTS idx_portal_activity_employee ON portal_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_portal_external_emails_employee ON portal_external_emails(employee_id);
CREATE INDEX IF NOT EXISTS idx_portal_external_emails_date ON portal_external_emails(email_date DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portal_projects_updated_at
  BEFORE UPDATE ON portal_projects
  FOR EACH ROW EXECUTE FUNCTION update_portal_updated_at();

CREATE TRIGGER update_portal_notes_updated_at
  BEFORE UPDATE ON portal_notes
  FOR EACH ROW EXECUTE FUNCTION update_portal_updated_at();

CREATE TRIGGER update_portal_daily_goals_updated_at
  BEFORE UPDATE ON portal_daily_goals
  FOR EACH ROW EXECUTE FUNCTION update_portal_updated_at();

-- Log activity on message received
CREATE OR REPLACE FUNCTION log_message_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_draft = false THEN
    INSERT INTO portal_activity (employee_id, activity_type, title, reference_type, reference_id)
    VALUES (NEW.recipient_id, 'message_received', 'New message: ' || NEW.subject, 'message', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_message_received
  AFTER INSERT ON portal_messages
  FOR EACH ROW EXECUTE FUNCTION log_message_activity();
