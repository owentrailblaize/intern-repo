import { NextRequest, NextResponse } from 'next/server';
import { supabase, SENDING_LINES } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const chapterId = new URL(request.url).searchParams.get('chapter_id');
    if (!chapterId) {
      return NextResponse.json({ data: null, error: { message: 'chapter_id is required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    const { data: queue } = await supabase
      .from('outreach_queue')
      .select('line_number, status')
      .eq('chapter_id', chapterId);

    if (!queue) {
      return NextResponse.json({ data: { total: 0, sent: 0, failed: 0, pending: 0, lines: [] }, error: null });
    }

    let totalSent = 0;
    let totalFailed = 0;
    let totalPending = 0;

    const lineData: Record<number, { total: number; sent: number; failed: number; pending: number }> = {};
    for (const ln of SENDING_LINES) {
      lineData[ln.number] = { total: 0, sent: 0, failed: 0, pending: 0 };
    }

    for (const q of queue) {
      const ld = lineData[q.line_number];
      if (!ld) continue;
      ld.total++;
      if (q.status === 'sent') { ld.sent++; totalSent++; }
      else if (q.status === 'failed') { ld.failed++; totalFailed++; }
      else { ld.pending++; totalPending++; }
    }

    const lines = SENDING_LINES.map(ln => {
      const d = lineData[ln.number];
      const processed = d.sent + d.failed;
      const currentDay = d.total > 0 ? Math.floor(processed / ln.daily_limit) + 1 : 0;
      const totalDays = d.total > 0 ? Math.ceil(d.total / ln.daily_limit) : 0;
      return {
        number: ln.number,
        label: ln.label,
        daily_limit: ln.daily_limit,
        total: d.total,
        sent: d.sent,
        failed: d.failed,
        pending: d.pending,
        current_day: Math.min(currentDay, totalDays),
        total_days: totalDays,
      };
    });

    const maxDays = Math.max(...lines.map(l => l.total_days), 0);
    const maxRemainingDays = Math.max(
      ...lines.map(l => l.pending > 0 ? Math.ceil(l.pending / l.daily_limit) : 0),
      0,
    );

    return NextResponse.json({
      data: {
        total: queue.length,
        sent: totalSent,
        failed: totalFailed,
        pending: totalPending,
        days_remaining: maxRemainingDays,
        total_days: maxDays,
        lines,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to fetch dashboard', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}
