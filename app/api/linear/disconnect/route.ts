import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revokeLinearToken } from '@/lib/linear';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * POST /api/linear/disconnect
 * Disconnect an employee's Linear account
 */
export async function POST(request: NextRequest) {
  try {
    const { employeeId } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get the current token
    const { data: tokenData, error: fetchError } = await supabase
      .from('linear_oauth_tokens')
      .select('access_token')
      .eq('employee_id', employeeId)
      .single();

    if (fetchError || !tokenData) {
      return NextResponse.json({
        success: true,
        message: 'No Linear connection found',
      });
    }

    // Revoke the token with Linear
    try {
      await revokeLinearToken(tokenData.access_token);
    } catch (revokeError) {
      // Log but don't fail - we'll still delete locally
      console.error('Failed to revoke Linear token:', revokeError);
    }

    // Delete the token from our database
    const { error: deleteError } = await supabase
      .from('linear_oauth_tokens')
      .delete()
      .eq('employee_id', employeeId);

    if (deleteError) {
      console.error('Failed to delete Linear token:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Linear account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Linear:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
