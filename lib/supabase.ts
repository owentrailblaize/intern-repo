import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if credentials are available
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Database Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  seniority: EmployeeSeniority;
  department: string;
  status: 'active' | 'onboarding' | 'inactive';
  start_date: string;
  avatar_url: string;
  created_at: string;
}

// Role hierarchy (higher number = more access)
export type EmployeeRole = 'intern' | 'member' | 'lead' | 'manager' | 'director' | 'cofounder' | 'founder';
export type EmployeeSeniority = 1 | 2 | 3 | 4 | 5;

export const ROLE_HIERARCHY: Record<EmployeeRole, number> = {
  intern: 1,
  member: 2,
  lead: 3,
  manager: 4,
  director: 5,
  cofounder: 6,
  founder: 7,
};

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  intern: 'Intern',
  member: 'Team Member',
  lead: 'Team Lead',
  manager: 'Manager',
  director: 'Director',
  cofounder: 'Co-Founder',
  founder: 'Founder',
};

// What each role can access
export const ROLE_PERMISSIONS: Record<EmployeeRole, string[]> = {
  intern: ['tasks', 'announcements', 'team'],
  member: ['tasks', 'announcements', 'team', 'projects'],
  lead: ['tasks', 'announcements', 'team', 'projects', 'reports'],
  manager: ['tasks', 'announcements', 'team', 'projects', 'reports', 'pipeline'],
  director: ['tasks', 'announcements', 'team', 'projects', 'reports', 'pipeline', 'customers'],
  cofounder: ['nucleus'], // Full access to Nucleus
  founder: ['nucleus'],   // Full access to Nucleus
};

export interface NetworkContact {
  id: string;
  name: string;
  title: string;
  organization: string;
  phone: string;
  email: string;
  linkedin: string;
  contact_type: 'investor' | 'angel' | 'vc' | 'partnership' | 'competitor' | 'connector' | 'ifc_president' | 'ifc_advisor' | 'greek_life' | 'consultant' | 'other';
  priority: 'hot' | 'warm' | 'cold';
  stage: 'identified' | 'researching' | 'outreach_pending' | 'first_contact' | 'follow_up' | 'in_conversation' | 'meeting_scheduled' | 'met' | 'nurturing' | 'committed' | 'passed' | 'dormant';
  first_contact_date: string;
  last_contact_date: string;
  next_followup_date: string;
  followup_count: number;
  potential_value: string;
  how_they_can_help: string;
  how_we_met: string;
  referred_by: string;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContactFollowup {
  id: string;
  contact_id: string;
  followup_type: 'email' | 'call' | 'meeting' | 'text' | 'linkedin' | 'other';
  summary: string;
  outcome: string;
  next_action: string;
  followup_date: string;
  created_at: string;
}

// Legacy alias for backwards compatibility
export type FundraisingContact = NetworkContact;

export interface Deal {
  id: string;
  name: string;
  organization: string;
  contact_name: string;
  value: number;
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  organization: string;
  email: string;
  stage: 'onboarding' | 'active' | 'at_risk' | 'churned';
  health: 'good' | 'warning' | 'critical';
  next_action: string;
  mrr: number;
  created_at: string;
}

// Chapter with full onboarding checklist
export interface Chapter {
  id: string;
  chapter_name: string;
  school: string;
  fraternity: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  
  status: 'onboarding' | 'active' | 'at_risk' | 'churned';
  health: 'good' | 'warning' | 'critical';
  mrr: number;
  
  // Onboarding Checklist
  chapter_created: boolean;
  exec_account: boolean;
  scheduled_first_call: boolean;
  exec_demo: boolean;
  alumni_list: boolean;
  alumni_emails_sent: boolean;
  member_onboarding: boolean;
  budget_set: boolean;
  simple_function_guide: boolean;
  events_scheduled: boolean;
  test_announcements: boolean;
  message_board_started: boolean;
  invitations_created: boolean;
  facebook_group: boolean;
  linkedin_group: boolean;
  instagram_post: boolean;
  
  onboarding_started: string;
  onboarding_completed: string;
  last_activity: string;
  next_action: string;
  notes: string;
  
  created_at: string;
  updated_at: string;
}

// Onboarding step definition for UI
export const ONBOARDING_STEPS = [
  { key: 'chapter_created', label: 'Chapter Created', category: 'setup' },
  { key: 'exec_account', label: 'Exec Account', category: 'setup' },
  { key: 'scheduled_first_call', label: 'Scheduled First Call', category: 'setup' },
  { key: 'exec_demo', label: 'Exec Demo', category: 'setup' },
  { key: 'alumni_list', label: 'Alumni List', category: 'alumni' },
  { key: 'alumni_emails_sent', label: 'Alumni Emails Sent', category: 'alumni' },
  { key: 'member_onboarding', label: 'Member Onboarding', category: 'members' },
  { key: 'budget_set', label: 'Budget Set', category: 'members' },
  { key: 'simple_function_guide', label: 'Simple Function Guide', category: 'training' },
  { key: 'events_scheduled', label: 'Events Scheduled', category: 'engagement' },
  { key: 'test_announcements', label: 'Test Announcements', category: 'engagement' },
  { key: 'message_board_started', label: 'Message Board Started', category: 'engagement' },
  { key: 'invitations_created', label: 'Invitations Created', category: 'social' },
  { key: 'facebook_group', label: 'Facebook Group', category: 'social' },
  { key: 'linkedin_group', label: 'LinkedIn Group', category: 'social' },
  { key: 'instagram_post', label: 'Instagram Post', category: 'social' },
] as const;

export interface EnterpriseContract {
  id: string;
  organization: string;
  type: 'ifc' | 'national_org' | 'partnership' | 'other';
  contact_name: string;
  contact_email: string;
  stage: 'prospecting' | 'negotiation' | 'contract_sent' | 'signed' | 'lost';
  value: number;
  notes: string;
  created_at: string;
}
