import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceRoleKey,
      });
      return NextResponse.json(
        { data: null, error: { message: 'Server configuration error: Missing Supabase credentials', code: 'CONFIG_ERROR' } },
        { status: 500 }
      );
    }

    // Admin client with service role key - bypasses RLS and email confirmation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await request.json();
    const { email, password, name, role, seniority, department, status, start_date } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { data: null, error: { message: 'Email, password, and name are required', code: 'MISSING_FIELDS' } },
        { status: 400 }
      );
    }

    // Create auth user using admin API (no email sent, auto-confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        name,
        role,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { data: null, error: { message: authError.message, code: 'AUTH_ERROR' } },
        { status: 400 }
      );
    }

    // Step 2: Create employee record linked to auth user
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert([{
        name,
        email,
        role,
        seniority: seniority || 1,
        department: department || '',
        status: status || 'onboarding',
        start_date: start_date || new Date().toISOString().split('T')[0],
        auth_user_id: authData.user?.id,
      }])
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Try to clean up the auth user if employee creation fails
      if (authData.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      }
      return NextResponse.json(
        { data: null, error: { message: employeeError.message, code: employeeError.code || 'DB_ERROR' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: employeeData, error: null });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
