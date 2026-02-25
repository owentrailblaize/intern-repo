import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const chapterId = new URL(request.url).searchParams.get('chapter_id');
    if (!chapterId) {
      return NextResponse.json({ data: null, error: { message: 'chapter_id is required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('sending_lines')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true });
    if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 });
    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('Error fetching sending lines:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to fetch sending lines', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { chapter_id, label, phone_number, daily_limit } = await request.json();
    if (!chapter_id || !label || !phone_number) {
      return NextResponse.json({ data: null, error: { message: 'chapter_id, label, and phone_number are required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }
    const { data: maxOrder } = await supabase
      .from('sending_lines')
      .select('sort_order')
      .eq('chapter_id', chapter_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('sending_lines')
      .insert({ chapter_id, label, phone_number, daily_limit: daily_limit || 50, sort_order: (maxOrder?.sort_order ?? -1) + 1 })
      .select()
      .single();
    if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 });
    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('Error creating sending line:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to create sending line', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ data: null, error: { message: 'id is required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }
    const allowed = ['label', 'phone_number', 'daily_limit', 'is_active', 'sort_order'];
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) sanitized[key] = updates[key];
    }
    const { data, error } = await supabase.from('sending_lines').update(sanitized).eq('id', id).select().single();
    if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 });
    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('Error updating sending line:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to update sending line', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ data: null, error: { message: 'id is required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }
    const { error } = await supabase.from('sending_lines').delete().eq('id', id);
    if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 });
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    console.error('Error deleting sending line:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to delete sending line', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}
