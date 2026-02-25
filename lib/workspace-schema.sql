-- WORKSPACE SCHEMA - Tasks and Leads tables with RLS

-- Tasks table
CREATE TABLE IF NOT EXISTS workspace_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT,
  due_date TIMESTAMPTZ,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS workspace_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responding', 'meeting_set', 'converted', 'lost')),
  lead_type TEXT DEFAULT 'other' CHECK (lead_type IN ('alumni', 'chapter', 'sponsor', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_employee_id ON workspace_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_status ON workspace_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_due_date ON workspace_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_created_at ON workspace_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_ticket_id ON workspace_tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_completed_at ON workspace_tasks(completed_at);

CREATE INDEX IF NOT EXISTS idx_workspace_leads_employee_id ON workspace_leads(employee_id);
CREATE INDEX IF NOT EXISTS idx_workspace_leads_status ON workspace_leads(status);
CREATE INDEX IF NOT EXISTS idx_workspace_leads_created_at ON workspace_leads(created_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workspace_tasks
DROP TRIGGER IF EXISTS update_workspace_tasks_updated_at ON workspace_tasks;
CREATE TRIGGER update_workspace_tasks_updated_at
  BEFORE UPDATE ON workspace_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for workspace_leads
DROP TRIGGER IF EXISTS update_workspace_leads_updated_at ON workspace_leads;
CREATE TRIGGER update_workspace_leads_updated_at
  BEFORE UPDATE ON workspace_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on both tables
ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_tasks (team-wide read access)
DROP POLICY IF EXISTS "Users can view own tasks" ON workspace_tasks;
DROP POLICY IF EXISTS "Team members can view all tasks" ON workspace_tasks;
CREATE POLICY "Team members can view all tasks" ON workspace_tasks
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND status = 'active')
  );

DROP POLICY IF EXISTS "Users can insert own tasks" ON workspace_tasks;
CREATE POLICY "Users can insert own tasks" ON workspace_tasks
  FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own tasks" ON workspace_tasks;
CREATE POLICY "Users can update own tasks" ON workspace_tasks
  FOR UPDATE
  USING (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tasks" ON workspace_tasks;
CREATE POLICY "Users can delete own tasks" ON workspace_tasks
  FOR DELETE
  USING (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

-- RLS Policies for workspace_leads
DROP POLICY IF EXISTS "Users can view own leads" ON workspace_leads;
CREATE POLICY "Users can view own leads" ON workspace_leads
  FOR SELECT
  USING (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own leads" ON workspace_leads;
CREATE POLICY "Users can insert own leads" ON workspace_leads
  FOR INSERT
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own leads" ON workspace_leads;
CREATE POLICY "Users can update own leads" ON workspace_leads
  FOR UPDATE
  USING (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own leads" ON workspace_leads;
CREATE POLICY "Users can delete own leads" ON workspace_leads
  FOR DELETE
  USING (employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid()));

-- Service role bypass policies
DROP POLICY IF EXISTS "Service role bypass tasks" ON workspace_tasks;
CREATE POLICY "Service role bypass tasks" ON workspace_tasks
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass leads" ON workspace_leads;
CREATE POLICY "Service role bypass leads" ON workspace_leads
  FOR ALL
  USING (auth.role() = 'service_role');
