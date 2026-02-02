import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialize Supabase client to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

export interface WorkspaceLead {
  id: string;
  employee_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  status: 'new' | 'contacted' | 'responding' | 'meeting_set' | 'converted' | 'lost';
  lead_type: 'alumni' | 'chapter' | 'sponsor' | 'other';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/workspace/leads
 * List leads for an employee
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');

    if (!employeeId) {
      return NextResponse.json(
        { data: null, error: { message: 'employee_id is required', code: 'MISSING_PARAM' } },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from('workspace_leads')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error('Leads GET error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/leads
 * Create a new lead
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, name, email, phone, organization, status, lead_type, notes } = body;

    if (!employee_id || !name) {
      return NextResponse.json(
        { data: null, error: { message: 'employee_id and name are required', code: 'MISSING_PARAM' } },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from('workspace_leads')
      .insert({
        employee_id,
        name,
        email: email || null,
        phone: phone || null,
        organization: organization || null,
        status: status || 'new',
        lead_type: lead_type || 'other',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (error) {
    console.error('Leads POST error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
