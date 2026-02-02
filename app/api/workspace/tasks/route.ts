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

export interface WorkspaceTask {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/workspace/tasks
 * List tasks for an employee
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
      .from('workspace_tasks')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, title, description, status, priority, category, due_date } = body;

    if (!employee_id || !title) {
      return NextResponse.json(
        { data: null, error: { message: 'employee_id and title are required', code: 'MISSING_PARAM' } },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from('workspace_tasks')
      .insert({
        employee_id,
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        category: category || null,
        due_date: due_date || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
