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
  auth_user_id?: string; // Links to Supabase Auth user
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

// Employee Role Types
export type EmployeeRole = 
  | 'founder' 
  | 'cofounder' 
  | 'growth_intern' 
  | 'engineer' 
  | 'sales_intern'
  | 'marketing_intern'
  | 'operations';

export type EmployeeSeniority = 1 | 2 | 3 | 4 | 5;

export const ROLE_HIERARCHY: Record<EmployeeRole, number> = {
  growth_intern: 1,
  sales_intern: 1,
  marketing_intern: 1,
  engineer: 2,
  operations: 3,
  cofounder: 5,
  founder: 6,
};

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  founder: 'Founder',
  cofounder: 'Co-Founder',
  growth_intern: 'Growth Intern',
  engineer: 'Engineer',
  sales_intern: 'Sales Intern',
  marketing_intern: 'Marketing Intern',
  operations: 'Operations',
};

// Specific permissions for each role
export const ROLE_PERMISSIONS: Record<EmployeeRole, string[]> = {
  // Founders - Full Nucleus access
  founder: ['nucleus', 'all'],
  cofounder: ['nucleus', 'all'],
  
  // Growth Intern - Alumni outreach, personal leads, alumni list
  growth_intern: [
    'tasks',
    'personal_leads',      // Their own leads/contacts
    'alumni_outreach',     // Alumni tracking
    'alumni_list',         // View alumni list
    'announcements',
  ],
  
  // Engineer - Code tasks, product features, bugs
  engineer: [
    'tasks',
    'product_tasks',       // Engineering tasks
    'bugs',                // Bug tracking
    'features',            // Feature requests
    'announcements',
    'team',
  ],
  
  // Sales Intern - Pipeline, leads
  sales_intern: [
    'tasks',
    'personal_leads',
    'pipeline_view',       // View-only pipeline
    'announcements',
  ],
  
  // Marketing Intern - Content, social
  marketing_intern: [
    'tasks',
    'content',
    'social_tracking',
    'announcements',
  ],
  
  // Operations - Tasks, processes
  operations: [
    'tasks',
    'operations',
    'customers_view',
    'announcements',
    'team',
  ],
};

export interface NetworkContact {
  id: string;
  name: string;
  title: string;
  organization: string;
  phone: string;
  email: string;
  linkedin: string;
  contact_type: 'investor' | 'angel' | 'vc' | 'partnership' | 'competitor' | 'connector' | 'ifc_president' | 'ifc_advisor' | 'chapter_president' | 'chapter_advisor' | 'greek_life' | 'consultant' | 'other';
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

export type DealStage = 'lead' | 'demo_booked' | 'first_demo' | 'second_call' | 'contract_sent' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  name: string;
  organization: string;
  contact_name: string;
  fraternity: string;
  phone: string;
  email: string;
  value: number;
  stage: DealStage;
  temperature: 'hot' | 'warm' | 'cold';
  expected_close: string;
  last_contact: string;
  next_followup: string;
  followup_count: number;
  notes: string;
  created_at: string;
}

// Gamification types
export interface SalesStats {
  total_points: number;
  level: number;
  current_streak: number;
  best_streak: number;
  deals_closed: number;
  demos_booked: number;
  followups_today: number;
}

export const STAGE_CONFIG: Record<DealStage, { label: string; points: number; emoji: string; color: string }> = {
  lead: { label: 'New Lead', points: 10, emoji: '🎯', color: '#6b7280' },
  demo_booked: { label: 'Demo Booked', points: 25, emoji: '📅', color: '#3b82f6' },
  first_demo: { label: 'First Demo', points: 50, emoji: '🎬', color: '#8b5cf6' },
  second_call: { label: 'Second Call', points: 75, emoji: '🤝', color: '#f59e0b' },
  contract_sent: { label: 'Contract Sent', points: 100, emoji: '📝', color: '#ec4899' },
  closed_won: { label: 'Closed Won', points: 500, emoji: '🏆', color: '#10b981' },
  closed_lost: { label: 'Closed Lost', points: 0, emoji: '❌', color: '#ef4444' },
};

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
export const LEVEL_TITLES = ['Rookie', 'Starter', 'Hustler', 'Closer', 'Dealmaker', 'Rainmaker', 'Sales Star', 'Legend', 'Champion', 'GOAT'];

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
  alumni_channels: string;
  
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
