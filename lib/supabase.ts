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
  role: string;
  status: 'active' | 'onboarding' | 'inactive';
  start_date: string;
  created_at: string;
}

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
