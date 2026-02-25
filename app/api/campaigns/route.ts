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
      .from('outreach_campaigns')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 });
    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to fetch campaigns', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { chapter_id, name, message_template, use_secondary_phone, contact_ids } = await request.json();

    if (!chapter_id || !name || !message_template || !contact_ids?.length) {
      return NextResponse.json({ data: null, error: { message: 'chapter_id, name, message_template, and contact_ids are required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    const { data: lines, error: linesErr } = await supabase
      .from('sending_lines')
      .select('*')
      .eq('chapter_id', chapter_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (linesErr || !lines?.length) {
      return NextResponse.json({ data: null, error: { message: 'No active sending lines configured', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    const { data: contacts, error: contactsErr } = await supabase
      .from('alumni_contacts')
      .select('id, phone_primary, phone_secondary')
      .in('id', contact_ids);

    if (contactsErr || !contacts?.length) {
      return NextResponse.json({ data: null, error: { message: 'No valid contacts found', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    const validContacts = contacts.filter(c => {
      const phone = use_secondary_phone ? (c.phone_secondary || c.phone_primary) : c.phone_primary;
      return !!phone;
    });

    if (validContacts.length === 0) {
      return NextResponse.json({ data: null, error: { message: 'None of the selected contacts have a phone number', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    const { data: campaign, error: campErr } = await supabase
      .from('outreach_campaigns')
      .insert({ chapter_id, name, message_template, use_secondary_phone: !!use_secondary_phone, status: 'active', total_contacts: validContacts.length })
      .select()
      .single();

    if (campErr) return NextResponse.json({ data: null, error: { message: campErr.message, code: 'DB_ERROR' } }, { status: 500 });

    const lineCount = lines.length;
    const chunkSize = Math.floor(validContacts.length / lineCount);
    const remainder = validContacts.length % lineCount;

    const assignments: { campaign_id: string; contact_id: string; line_id: string; send_phone: string; queue_position: number; scheduled_day: number }[] = [];
    const lineStates: { campaign_id: string; line_id: string; contacts_assigned: number }[] = [];
    let contactIdx = 0;

    for (let li = 0; li < lineCount; li++) {
      const line = lines[li];
      const count = chunkSize + (li === lineCount - 1 ? remainder : 0);
      lineStates.push({ campaign_id: campaign.id, line_id: line.id, contacts_assigned: count });

      for (let qi = 0; qi < count; qi++) {
        const contact = validContacts[contactIdx++];
        const sendPhone = use_secondary_phone
          ? (contact.phone_secondary || contact.phone_primary)!
          : contact.phone_primary!;
        const dayNum = Math.floor(qi / line.daily_limit) + 1;

        assignments.push({
          campaign_id: campaign.id,
          contact_id: contact.id,
          line_id: line.id,
          send_phone: sendPhone,
          queue_position: qi + 1,
          scheduled_day: dayNum,
        });
      }
    }

    const batchSize = 500;
    for (let i = 0; i < assignments.length; i += batchSize) {
      const { error: aErr } = await supabase.from('campaign_assignments').insert(assignments.slice(i, i + batchSize));
      if (aErr) {
        console.error('Assignment insert error:', aErr);
        return NextResponse.json({ data: null, error: { message: `Failed to create assignments: ${aErr.message}`, code: 'DB_ERROR' } }, { status: 500 });
      }
    }

    await supabase.from('campaign_line_states').insert(lineStates);

    return NextResponse.json({ data: campaign, error: null });
  } catch (err) {
    console.error('Error creating campaign:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to create campaign', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } }, { status: 500 });
  }
  try {
    const { id, status, line_id, is_paused } = await request.json();
    if (!id) {
      return NextResponse.json({ data: null, error: { message: 'id is required', code: 'VALIDATION_ERROR' } }, { status: 400 });
    }

    if (line_id !== undefined && is_paused !== undefined) {
      await supabase.from('campaign_line_states').update({ is_paused }).eq('campaign_id', id).eq('line_id', line_id);
    }

    if (status) {
      const { data, error } = await supabase.from('outreach_campaigns').update({ status }).eq('id', id).select().single();
      if (error) return NextResponse.json({ data: null, error: { message: error.message, code: 'DB_ERROR' } }, { status: 500 });
      return NextResponse.json({ data, error: null });
    }

    return NextResponse.json({ data: { updated: true }, error: null });
  } catch (err) {
    console.error('Error updating campaign:', err);
    return NextResponse.json({ data: null, error: { message: 'Failed to update campaign', code: 'SERVER_ERROR' } }, { status: 500 });
  }
}
