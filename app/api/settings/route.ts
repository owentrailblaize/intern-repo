import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get a setting by key
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { data: null, error: { message: 'Key is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      // Return default for booking_link if not found
      if (key === 'booking_link') {
        return NextResponse.json({ 
          data: { value: '' }, 
          error: null 
        });
      }
      return NextResponse.json(
        { data: null, error: { message: 'Setting not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('Error getting setting:', err);
    return NextResponse.json(
      { data: null, error: { message: 'Failed to get setting', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}

// Update a setting
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } },
      { status: 500 }
    );
  }

  try {
    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { data: null, error: { message: 'Key and value are required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ 
        key, 
        value,
        updated_at: new Date().toISOString() 
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('Error updating setting:', err);
    return NextResponse.json(
      { data: null, error: { message: 'Failed to update setting', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
