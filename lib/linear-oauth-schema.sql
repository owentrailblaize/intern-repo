-- Linear OAuth & Integration Schema
-- Run this in your Supabase SQL Editor

-- Store Linear OAuth tokens for users
CREATE TABLE IF NOT EXISTS linear_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  linear_user_id TEXT,
  linear_user_email TEXT,
  linear_user_name TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Store synced Linear teams
CREATE TABLE IF NOT EXISTS linear_teams (
  id TEXT PRIMARY KEY, -- Linear team ID
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store synced Linear projects
CREATE TABLE IF NOT EXISTS linear_projects (
  id TEXT PRIMARY KEY, -- Linear project ID
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  state TEXT,
  start_date DATE,
  target_date DATE,
  progress REAL DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store synced Linear issues
CREATE TABLE IF NOT EXISTS linear_issues (
  id TEXT PRIMARY KEY, -- Linear issue ID
  identifier TEXT NOT NULL, -- e.g., "TRA-123"
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  priority_label TEXT,
  state_id TEXT,
  state_name TEXT,
  state_color TEXT,
  state_type TEXT, -- backlog, unstarted, started, completed, canceled
  assignee_id TEXT,
  assignee_name TEXT,
  assignee_email TEXT,
  creator_id TEXT,
  creator_name TEXT,
  team_id TEXT REFERENCES linear_teams(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES linear_projects(id) ON DELETE SET NULL,
  estimate INTEGER,
  due_date DATE,
  url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Linear issue labels
CREATE TABLE IF NOT EXISTS linear_labels (
  id TEXT PRIMARY KEY, -- Linear label ID
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  team_id TEXT REFERENCES linear_teams(id) ON DELETE CASCADE,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many relationship between issues and labels
CREATE TABLE IF NOT EXISTS linear_issue_labels (
  issue_id TEXT REFERENCES linear_issues(id) ON DELETE CASCADE,
  label_id TEXT REFERENCES linear_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (issue_id, label_id)
);

-- Store Linear comments
CREATE TABLE IF NOT EXISTS linear_comments (
  id TEXT PRIMARY KEY, -- Linear comment ID
  issue_id TEXT REFERENCES linear_issues(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  user_avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Linear attachments
CREATE TABLE IF NOT EXISTS linear_attachments (
  id TEXT PRIMARY KEY, -- Linear attachment ID
  issue_id TEXT REFERENCES linear_issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  subtitle TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store webhook events for audit/debugging
CREATE TABLE IF NOT EXISTS linear_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id TEXT,
  event_type TEXT NOT NULL,
  action TEXT NOT NULL,
  data JSONB NOT NULL,
  organization_id TEXT,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_linear_oauth_employee ON linear_oauth_tokens(employee_id);
CREATE INDEX IF NOT EXISTS idx_linear_issues_team ON linear_issues(team_id);
CREATE INDEX IF NOT EXISTS idx_linear_issues_project ON linear_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_linear_issues_assignee ON linear_issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_linear_issues_state_type ON linear_issues(state_type);
CREATE INDEX IF NOT EXISTS idx_linear_issues_identifier ON linear_issues(identifier);
CREATE INDEX IF NOT EXISTS idx_linear_issues_synced ON linear_issues(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_linear_comments_issue ON linear_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_linear_attachments_issue ON linear_attachments(issue_id);
CREATE INDEX IF NOT EXISTS idx_linear_webhook_events_type ON linear_webhook_events(event_type, action);
CREATE INDEX IF NOT EXISTS idx_linear_webhook_events_created ON linear_webhook_events(created_at DESC);

-- Trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_linear_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_linear_oauth_tokens_updated_at ON linear_oauth_tokens;
CREATE TRIGGER update_linear_oauth_tokens_updated_at
    BEFORE UPDATE ON linear_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_linear_oauth_updated_at();

-- Enable RLS on all tables
ALTER TABLE linear_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_issue_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for linear_oauth_tokens (personal tokens)
DROP POLICY IF EXISTS "Users can view own tokens" ON linear_oauth_tokens;
CREATE POLICY "Users can view own tokens" ON linear_oauth_tokens
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own tokens" ON linear_oauth_tokens;
CREATE POLICY "Users can insert own tokens" ON linear_oauth_tokens
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own tokens" ON linear_oauth_tokens;
CREATE POLICY "Users can update own tokens" ON linear_oauth_tokens
    FOR UPDATE USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own tokens" ON linear_oauth_tokens;
CREATE POLICY "Users can delete own tokens" ON linear_oauth_tokens
    FOR DELETE USING (
        employee_id IN (
            SELECT id FROM employees WHERE auth_user_id = auth.uid()
        )
    );

-- Service role bypass for webhooks
DROP POLICY IF EXISTS "Service role bypass linear_oauth_tokens" ON linear_oauth_tokens;
CREATE POLICY "Service role bypass linear_oauth_tokens" ON linear_oauth_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for synced Linear data (viewable by engineers and founders)
DROP POLICY IF EXISTS "Engineers can view linear teams" ON linear_teams;
CREATE POLICY "Engineers can view linear teams" ON linear_teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder', 'engineer')
        )
    );

DROP POLICY IF EXISTS "Engineers can view linear projects" ON linear_projects;
CREATE POLICY "Engineers can view linear projects" ON linear_projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder', 'engineer')
        )
    );

DROP POLICY IF EXISTS "Engineers can view linear issues" ON linear_issues;
CREATE POLICY "Engineers can view linear issues" ON linear_issues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder', 'engineer')
        )
    );

DROP POLICY IF EXISTS "Engineers can view linear labels" ON linear_labels;
CREATE POLICY "Engineers can view linear labels" ON linear_labels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder', 'engineer')
        )
    );

DROP POLICY IF EXISTS "Engineers can view linear issue labels" ON linear_issue_labels;
CREATE POLICY "Engineers can view linear issue labels" ON linear_issue_labels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder', 'engineer')
        )
    );

DROP POLICY IF EXISTS "Engineers can view linear comments" ON linear_comments;
CREATE POLICY "Engineers can view linear comments" ON linear_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder', 'engineer')
        )
    );

DROP POLICY IF EXISTS "Engineers can view linear attachments" ON linear_attachments;
CREATE POLICY "Engineers can view linear attachments" ON linear_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder', 'engineer')
        )
    );

-- Service role full access for all Linear tables (for webhooks and API routes)
DROP POLICY IF EXISTS "Service role bypass linear_teams" ON linear_teams;
CREATE POLICY "Service role bypass linear_teams" ON linear_teams
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass linear_projects" ON linear_projects;
CREATE POLICY "Service role bypass linear_projects" ON linear_projects
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass linear_issues" ON linear_issues;
CREATE POLICY "Service role bypass linear_issues" ON linear_issues
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass linear_labels" ON linear_labels;
CREATE POLICY "Service role bypass linear_labels" ON linear_labels
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass linear_issue_labels" ON linear_issue_labels;
CREATE POLICY "Service role bypass linear_issue_labels" ON linear_issue_labels
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass linear_comments" ON linear_comments;
CREATE POLICY "Service role bypass linear_comments" ON linear_comments
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass linear_attachments" ON linear_attachments;
CREATE POLICY "Service role bypass linear_attachments" ON linear_attachments
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass linear_webhook_events" ON linear_webhook_events;
CREATE POLICY "Service role bypass linear_webhook_events" ON linear_webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- View webhook events (founders only for debugging)
DROP POLICY IF EXISTS "Founders can view webhook events" ON linear_webhook_events;
CREATE POLICY "Founders can view webhook events" ON linear_webhook_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('founder', 'cofounder')
        )
    );
