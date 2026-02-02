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

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspace/tasks/[id]
 * Get a single task by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { data, error } = await getSupabase()
      .from('workspace_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { data: null, error: { message: 'Task not found', code: 'NOT_FOUND' } },
          { status: 404 }
        );
      }
      console.error('Error fetching task:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error('Task GET error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspace/tasks/[id]
 * Update a task
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Only allow updating specific fields
    const allowedFields = ['title', 'description', 'status', 'priority', 'category', 'due_date'];
    const updates: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { data: null, error: { message: 'No valid fields to update', code: 'INVALID_UPDATE' } },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from('workspace_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { data: null, error: { message: 'Task not found', code: 'NOT_FOUND' } },
          { status: 404 }
        );
      }
      console.error('Error updating task:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error('Task PATCH error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspace/tasks/[id]
 * Delete a task
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { error } = await getSupabase()
      .from('workspace_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
