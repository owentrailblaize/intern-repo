import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { id } = await params;

    const { data: campaign, error: campErr } = await supabase
      .from('outreach_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    if (campErr) return NextResponse.json({ data: null, error: { message: campErr.message, code: 'DB_ERROR' } }, { status: 500 });

    const { data: lineStates } = await supabase
      .from('campaign_line_states')
      .select('*, line:sending_lines(*)')
      .eq('campaign_id', id);

    const lineProgress = [];
    for (const ls of (lineStates || [])) {
      const { count: sentCount } = await supabase
        .from('campaign_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('line_id', ls.line_id)
        .eq('status', 'sent');

      const { count: failedCount } = await supabase
        .from('campaign_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('line_id', ls.line_id)
        .eq('status', 'failed');

      const totalDays = Math.ceil(ls.contacts_assigned / (ls.line?.daily_limit || 50));
      const currentDay = Math.floor((sentCount ?? 0) / (ls.line?.daily_limit || 50)) + 1;

      lineProgress.push({
        ...ls,
        sent: sentCount ?? 0,
        failed: failedCount ?? 0,
        total_days: totalDays,
        current_day: Math.min(currentDay, totalDays),
      });
    }

    const { count: totalSent } = await supabase
      .from('campaign_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'sent');

    const { count: totalFailed } = await supabase
      .from('campaign_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'failed');

    return NextResponse.json({
      data: {
        campaign,
        total_sent: totalSent ?? 0,
        total_failed: totalFailed ?? 0,
        line_progress: lineProgress,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error fetching campaign detail:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to fetch campaign', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}
