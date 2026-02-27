import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapter_id');

    if (!chapterId) {
      return NextResponse.json(
        { data: null, error: { message: 'chapter_id is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const { count: total } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId);

    const { count: havePhone } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .not('phone_primary', 'is', null);

    const { count: haveEmail } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .not('email', 'is', null);

    const { count: contacted } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .neq('outreach_status', 'not_contacted');

    const { count: imessageCount } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .eq('is_imessage', true);

    const { count: smsCount } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .eq('is_imessage', false);

    const { count: unverifiedCount } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .not('phone_primary', 'is', null)
      .is('is_imessage', null);

    const { count: respondedCount } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .not('last_response_at', 'is', null);

    const { count: signedUpCount } = await supabase
      .from('alumni_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .eq('outreach_status', 'signed_up');

    return NextResponse.json({
      data: {
        total: total ?? 0,
        have_phone: havePhone ?? 0,
        have_email: haveEmail ?? 0,
        contacted: contacted ?? 0,
        imessage: imessageCount ?? 0,
        sms: smsCount ?? 0,
        unverified: unverifiedCount ?? 0,
        responded: respondedCount ?? 0,
        signed_up: signedUpCount ?? 0,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error fetching alumni stats:', err);
    return NextResponse.json(
      { data: null, error: { message: 'Failed to fetch alumni stats', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
