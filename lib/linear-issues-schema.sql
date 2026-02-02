-- ENGINEERING ISSUES SCHEMA - Linear-style issue tracking for engineers
-- This provides a simplified, fast issue tracking system similar to Linear

-- Issue statuses enum-style tracking
-- Statuses: backlog, todo, in_progress, in_review, done, cancelled

-- Projects table for organizing issues
CREATE TABLE IF NOT EXISTS engineering_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE, -- e.g., "TRA" for "TRA-123"
  description TEXT,
  color TEXT DEFAULT '#5e6ad2',
  lead_id UUID REFERENCES employees(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cycles (sprints) for organizing work
CREATE TABLE IF NOT EXISTS engineering_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES engineering_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues table - the core of Linear-style tracking
CREATE TABLE IF NOT EXISTS engineering_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES engineering_projects(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES engineering_cycles(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- Issue identifiers
  number INTEGER, -- Auto-incrementing per project (set by trigger)
  
  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')),
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 4), -- 0=none, 1=urgent, 2=high, 3=medium, 4=low
  
  -- Labels and categorization
  labels TEXT[] DEFAULT '{}',
  issue_type TEXT DEFAULT 'feature' CHECK (issue_type IN ('feature', 'bug', 'improvement', 'task', 'epic')),
  
  -- Dates
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Sorting
  sort_order REAL DEFAULT 0
);

-- Create a sequence for issue numbers per project
CREATE OR REPLACE FUNCTION get_next_issue_number(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1 INTO next_number
  FROM engineering_issues
  WHERE project_id = p_project_id;
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set issue number
CREATE OR REPLACE FUNCTION set_issue_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number := get_next_issue_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_issue_number_trigger ON engineering_issues;
CREATE TRIGGER set_issue_number_trigger
  BEFORE INSERT ON engineering_issues
  FOR EACH ROW
  EXECUTE FUNCTION set_issue_number();

-- Trigger to update timestamps
DROP TRIGGER IF EXISTS update_engineering_issues_updated_at ON engineering_issues;
CREATE TRIGGER update_engineering_issues_updated_at
  BEFORE UPDATE ON engineering_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_engineering_projects_updated_at ON engineering_projects;
CREATE TRIGGER update_engineering_projects_updated_at
  BEFORE UPDATE ON engineering_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_engineering_issues_project_id ON engineering_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_assignee_id ON engineering_issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_status ON engineering_issues(status);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_cycle_id ON engineering_issues(cycle_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_created_at ON engineering_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_number ON engineering_issues(project_id, number);

-- RLS Policies
ALTER TABLE engineering_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineering_issues ENABLE ROW LEVEL SECURITY;

-- Engineers can view all engineering data
DROP POLICY IF EXISTS "Engineers can view projects" ON engineering_projects;
CREATE POLICY "Engineers can view projects" ON engineering_projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Engineers can manage projects" ON engineering_projects;
CREATE POLICY "Engineers can manage projects" ON engineering_projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'software_engineer')
    )
  );

DROP POLICY IF EXISTS "Engineers can view cycles" ON engineering_cycles;
CREATE POLICY "Engineers can view cycles" ON engineering_cycles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Engineers can manage cycles" ON engineering_cycles;
CREATE POLICY "Engineers can manage cycles" ON engineering_cycles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'software_engineer')
    )
  );

DROP POLICY IF EXISTS "Engineers can view issues" ON engineering_issues;
CREATE POLICY "Engineers can view issues" ON engineering_issues
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Engineers can manage issues" ON engineering_issues;
CREATE POLICY "Engineers can manage issues" ON engineering_issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('founder', 'software_engineer')
    )
  );

-- Service role bypass
DROP POLICY IF EXISTS "Service role bypass projects" ON engineering_projects;
CREATE POLICY "Service role bypass projects" ON engineering_projects
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass cycles" ON engineering_cycles;
CREATE POLICY "Service role bypass cycles" ON engineering_cycles
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role bypass issues" ON engineering_issues;
CREATE POLICY "Service role bypass issues" ON engineering_issues
  FOR ALL USING (auth.role() = 'service_role');

-- Seed initial project
INSERT INTO engineering_projects (name, identifier, description, color)
VALUES ('Trailblaize', 'TRA', 'Main Trailblaize platform development', '#5e6ad2')
ON CONFLICT (identifier) DO NOTHING;
