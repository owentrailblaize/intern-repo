import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { autoAssignQueue } from '@/lib/outreach';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { chapter_id } = await request.json();
    if (!chapter_id) {
      return NextResponse.json({ data: null, error: { message: 'chapter_id is required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }
    const result = await autoAssignQueue(chapter_id);
    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    console.error('Error auto-assigning queue:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to assign queue', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}
