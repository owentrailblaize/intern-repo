-- MIGRATION: Team-wide task visibility, ticket linking, completion tracking
-- Run this in Supabase SQL Editor after the initial workspace-schema.sql

-- Add ticket linking
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;

-- Add completion timestamp for weekly summary tracking
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_ticket_id ON workspace_tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_completed_at ON workspace_tasks(completed_at);

-- Backfill completed_at for existing done tasks
UPDATE workspace_tasks SET completed_at = updated_at WHERE status = 'done' AND completed_at IS NULL;

-- Update RLS: Allow all active employees to view all tasks (team visibility)
DROP POLICY IF EXISTS "Users can view own tasks" ON workspace_tasks;
CREATE POLICY "Team members can view all tasks" ON workspace_tasks
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND status = 'active')
  );

-- Insert/update/delete remain restricted to own tasks
-- (existing policies: "Users can insert own tasks", "Users can update own tasks", "Users can delete own tasks")
-- Service role bypass policy already exists
