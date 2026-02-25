import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/outreach/report
 * Body: { assignment_id, status: "sent" | "failed", error_message? }
 * Marks an assignment as sent or failed, and updates the contact's outreach_status.
 */
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { assignment_id, status, error_message } = await request.json();

    if (!assignment_id || !status || !['sent', 'failed'].includes(status)) {
      return NextResponse.json({ data: null, error: { message: 'assignment_id and status (sent/failed) are required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'sent') updateData.sent_at = new Date().toISOString();
    if (error_message) updateData.error_message = error_message;

    const { data: assignment, error: updateErr } = await supabase
      .from('campaign_assignments')
      .update(updateData)
      .eq('id', assignment_id)
      .select('contact_id, campaign_id, line_id')
      .single();

    if (updateErr) return NextResponse.json({ data: null, error: { message: updateErr.message, code: 'DB_ERROR' } }, { status: 500 });

    if (status === 'sent') {
      await supabase
        .from('alumni_contacts')
        .update({ outreach_status: 'verified' })
        .eq('id', assignment.contact_id)
        .eq('outreach_status', 'not_contacted');
    } else if (status === 'failed' && error_message?.toLowerCase().includes('wrong number')) {
      await supabase
        .from('alumni_contacts')
        .update({ outreach_status: 'wrong_number' })
        .eq('id', assignment.contact_id);
    }

    const { count: remaining } = await supabase
      .from('campaign_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', assignment.campaign_id)
      .eq('status', 'queued');

    if ((remaining ?? 0) === 0) {
      await supabase
        .from('outreach_campaigns')
        .update({ status: 'completed' })
        .eq('id', assignment.campaign_id);
    }

    return NextResponse.json({ data: { updated: true, remaining: remaining ?? 0 }, error: null });
  } catch (err) {
    console.error('Error reporting send:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to report send status', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}
