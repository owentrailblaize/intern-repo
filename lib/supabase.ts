import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export interface FundraisingContact {
  id: string;
  name: string;
  firm: string;
  email: string;
  stage: 'outreach' | 'meeting_set' | 'in_conversation' | 'committed' | 'passed';
  notes: string;
  last_contact: string;
  created_at: string;
}

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
