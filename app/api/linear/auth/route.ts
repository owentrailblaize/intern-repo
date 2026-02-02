import { NextRequest, NextResponse } from 'next/server';
import { getLinearAuthUrl, LINEAR_CONFIG } from '@/lib/linear';

/**
 * GET /api/linear/auth
 * Initiates Linear OAuth flow - redirects user to Linear consent screen
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get('employee_id');

  if (!employeeId) {
    return NextResponse.json(
      { error: 'Employee ID is required' },
      { status: 400 }
    );
  }

  // Check if Linear credentials are configured
  if (!LINEAR_CONFIG.clientId) {
    return NextResponse.json(
      { error: 'Linear OAuth is not configured. Please set LINEAR_CLIENT_ID environment variable.' },
      { status: 500 }
    );
  }

  // Create state parameter with employee ID for callback
  const state = Buffer.from(JSON.stringify({ employeeId })).toString('base64');
  
  const authUrl = getLinearAuthUrl(state);
  
  return NextResponse.redirect(authUrl);
}

/**
 * POST /api/linear/auth
 * Returns the auth URL without redirecting (for client-side handling)
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

    if (!LINEAR_CONFIG.clientId) {
      return NextResponse.json(
        { error: 'Linear OAuth is not configured' },
        { status: 500 }
      );
    }

    const state = Buffer.from(JSON.stringify({ employeeId })).toString('base64');
    const authUrl = getLinearAuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating Linear auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
