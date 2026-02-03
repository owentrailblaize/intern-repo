import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// GET - Fetch single application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { data: null, error: { message: 'Server configuration error', code: 'CONFIG_ERROR' } },
        { status: 500 }
      );
    }

    const { id } = await params;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabaseAdmin
      .from('job_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

// PATCH - Update application status/review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { data: null, error: { message: 'Server configuration error', code: 'CONFIG_ERROR' } },
        { status: 500 }
      );
    }

    const { id } = await params;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Only include fields that are provided
    const allowedFields = [
      'status',
      'reviewer_id',
      'reviewer_notes',
      'rating',
      'reviewed_at',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Auto-set reviewed_at when status changes from pending
    if (body.status && body.status !== 'pending' && !body.reviewed_at) {
      updateData.reviewed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('job_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

// DELETE - Remove an application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { data: null, error: { message: 'Server configuration error', code: 'CONFIG_ERROR' } },
        { status: 500 }
      );
    }

    const { id } = await params;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabaseAdmin
      .from('job_applications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting application:', error);
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: { success: true }, error: null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
