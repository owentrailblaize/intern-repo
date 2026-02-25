import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/outreach/queue?line_id=xxx&campaign_id=xxx
 * Returns today's queue for a given line — contacts that are queued
 * for the current day (based on how many have been sent so far).
 */
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('line_id');
    const campaignId = searchParams.get('campaign_id');

    if (!lineId || !campaignId) {
      return NextResponse.json({ data: null, error: { message: 'line_id and campaign_id are required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    const { data: lineState } = await supabase
      .from('campaign_line_states')
      .select('is_paused')
      .eq('campaign_id', campaignId)
      .eq('line_id', lineId)
      .single();

    if (lineState?.is_paused) {
      return NextResponse.json({ data: { queue: [], paused: true }, error: null });
    }

    const { data: campaign } = await supabase
      .from('outreach_campaigns')
      .select('status, message_template')
      .eq('id', campaignId)
      .single();

    if (!campaign || campaign.status === 'paused' || campaign.status === 'completed') {
      return NextResponse.json({ data: { queue: [], paused: campaign?.status !== 'completed', completed: campaign?.status === 'completed' }, error: null });
    }

    const { count: sentSoFar } = await supabase
      .from('campaign_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('line_id', lineId)
      .in('status', ['sent', 'failed']);

    const { data: line } = await supabase
      .from('sending_lines')
      .select('daily_limit')
      .eq('id', lineId)
      .single();

    const dailyLimit = line?.daily_limit || 50;
    const currentDay = Math.floor((sentSoFar ?? 0) / dailyLimit) + 1;

    const { data: queue, error } = await supabase
      .from('campaign_assignments')
      .select('*, contact:alumni_contacts(id, first_name, last_name, phone_primary, phone_secondary, email, year)')
      .eq('campaign_id', campaignId)
      .eq('line_id', lineId)
      .eq('scheduled_day', currentDay)
      .eq('status', 'queued')
      .order('queue_position', { ascending: true });

    if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 });

    return NextResponse.json({
      data: {
        queue: queue || [],
        paused: false,
        completed: false,
        current_day: currentDay,
        message_template: campaign.message_template,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error fetching queue:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to fetch queue', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}
