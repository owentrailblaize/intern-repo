import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createChat, sleep } from '@/lib/linq';
import { SENDING_LINES } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const LINE_PHONES = SENDING_LINES.map(l => l.phone);

const TEMPLATES = {
  touch1: (vars: TemplateVars) =>
    `Hey is this ${vars.first_name} ${vars.last_name}? My name is ${vars.sender_name}, and I am checking to verify your phone number for the ${vars.school} ${vars.fraternity} alumni list.`,
  touch2_confirmed: (vars: TemplateVars) =>
    `Great, I'm reaching out because we partnered with ${vars.school} ${vars.fraternity} to launch Trailblaize, a free LinkedIn-style platform that connects actives and alumni. Here's the signup link: ${vars.signup_link}`,
  touch2_no_response: (vars: TemplateVars) =>
    `Hey ${vars.first_name}, following up — we partnered with ${vars.school} ${vars.fraternity} to launch Trailblaize, a free platform that connects actives and alumni. Here's the signup link if you're interested: ${vars.signup_link}`,
  touch3: (vars: TemplateVars) =>
    `Hey ${vars.first_name}, just checking back in — did you get a chance to sign up? Happy to answer any questions.`,
};

interface TemplateVars {
  first_name: string;
  last_name: string;
  sender_name: string;
  school: string;
  fraternity: string;
  signup_link: string;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { data: null, error: { message: 'Server configuration error', code: 'CONFIG_ERROR' } },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await request.json();
    const {
      chapter_id,
      touch,
      sender_name = 'Owen',
      school,
      fraternity,
      signup_link,
      batch_size = 50,
      template_override,
    } = body;

    if (!chapter_id || !touch || ![1, 2, 3].includes(touch)) {
      return NextResponse.json(
        { data: null, error: { message: 'chapter_id and touch (1, 2, or 3) are required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    if ((touch === 1 || touch === 2) && (!school || !fraternity)) {
      return NextResponse.json(
        { data: null, error: { message: 'school and fraternity are required for touch 1 and 2', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    if (touch === 2 && !signup_link) {
      return NextResponse.json(
        { data: null, error: { message: 'signup_link is required for touch 2', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    // Build eligibility query based on touch
    let query = supabase
      .from('alumni_contacts')
      .select('id, first_name, last_name, phone_primary, linq_chat_id, assigned_line, response_classification, outreach_status')
      .eq('chapter_id', chapter_id)
      .eq('is_imessage', true);

    if (touch === 1) {
      query = query
        .eq('outreach_status', 'not_contacted')
        .is('touch1_sent_at', null);
    } else if (touch === 2) {
      query = query
        .not('touch1_sent_at', 'is', null)
        .is('touch2_sent_at', null);
      // Touch 2 eligibility: confirmed response OR 2+ days since touch1
      // We'll filter in-memory for the date condition
    } else if (touch === 3) {
      query = query
        .not('touch2_sent_at', 'is', null)
        .is('touch3_sent_at', null)
        .not('outreach_status', 'in', '("signed_up","wrong_number","opted_out")');
      // We'll filter 2-day wait in-memory
    }

    const { data: candidates, error: fetchErr } = await query
      .order('created_at', { ascending: true })
      .limit(batch_size * 2); // Over-fetch for in-memory filtering

    if (fetchErr) {
      return NextResponse.json(
        { data: null, error: { message: fetchErr.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        data: { sent: 0, per_line: [], errors: [] },
        error: null,
      });
    }

    // For touch 2 & 3, we need the timestamp fields for date filtering
    let eligible = candidates;
    if (touch === 2 || touch === 3) {
      const ids = candidates.map(c => c.id);
      const { data: withDates } = await supabase
        .from('alumni_contacts')
        .select('id, touch1_sent_at, touch2_sent_at, response_classification')
        .in('id', ids);

      const dateMap = new Map((withDates || []).map(d => [d.id, d]));
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      if (touch === 2) {
        eligible = candidates.filter(c => {
          const d = dateMap.get(c.id);
          if (!d) return false;
          return d.response_classification === 'confirmed' || (d.touch1_sent_at && d.touch1_sent_at < twoDaysAgo);
        });
      } else {
        eligible = candidates.filter(c => {
          const d = dateMap.get(c.id);
          if (!d) return false;
          return d.touch2_sent_at && d.touch2_sent_at < twoDaysAgo;
        });
      }
    }

    eligible = eligible.slice(0, batch_size);

    if (eligible.length === 0) {
      return NextResponse.json({
        data: { sent: 0, per_line: [], errors: [] },
        error: null,
      });
    }

    // Check today's send count per line
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();
    const touchCol = `touch${touch}_sent_at`;

    const lineCounts: Record<number, number> = {};
    for (const line of SENDING_LINES) {
      const { count } = await supabase
        .from('alumni_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapter_id)
        .eq('assigned_line', line.number)
        .gte(touchCol, todayStr);
      lineCounts[line.number] = count ?? 0;
    }

    const availableLines = SENDING_LINES
      .filter(l => lineCounts[l.number] < l.daily_limit)
      .map(l => ({ ...l, remaining: l.daily_limit - lineCounts[l.number], sent_now: 0 }));

    if (availableLines.length === 0) {
      return NextResponse.json({
        data: { sent: 0, per_line: [], errors: [], message: 'All lines at daily capacity' },
        error: null,
      });
    }

    const errors: { contact_id: string; message: string }[] = [];
    let sentCount = 0;
    const SEND_BATCH = 5;

    for (let i = 0; i < eligible.length; i += SEND_BATCH) {
      if (i > 0) await sleep(1000);
      const batch = eligible.slice(i, i + SEND_BATCH);

      await Promise.all(batch.map(async (contact) => {
        // Pick line with most remaining capacity
        const line = availableLines
          .filter(l => l.remaining > 0)
          .sort((a, b) => b.remaining - a.remaining)[0];

        if (!line) return;

        const vars: TemplateVars = {
          first_name: contact.first_name,
          last_name: contact.last_name,
          sender_name: SENDING_LINES.find(l => l.number === line.number)?.label || sender_name,
          school: school || '',
          fraternity: fraternity || '',
          signup_link: signup_link || '',
        };

        let message: string;
        if (template_override) {
          message = template_override
            .replace(/\{first_name\}/g, vars.first_name)
            .replace(/\{last_name\}/g, vars.last_name)
            .replace(/\{sender_name\}/g, vars.sender_name)
            .replace(/\{school\}/g, vars.school)
            .replace(/\{fraternity\}/g, vars.fraternity)
            .replace(/\{signup_link\}/g, vars.signup_link);
        } else if (touch === 1) {
          message = TEMPLATES.touch1(vars);
        } else if (touch === 2) {
          message = contact.response_classification === 'confirmed'
            ? TEMPLATES.touch2_confirmed(vars)
            : TEMPLATES.touch2_no_response(vars);
        } else {
          message = TEMPLATES.touch3(vars);
        }

        try {
          const chat = await createChat(line.phone, contact.phone_primary!, message);

          const updateData: Record<string, unknown> = {
            [touchCol]: new Date().toISOString(),
            assigned_line: line.number,
            linq_chat_id: chat.id,
          };

          if (touch === 1) updateData.outreach_status = 'verified';
          else if (touch === 2) updateData.outreach_status = 'pitched';

          await supabase
            .from('alumni_contacts')
            .update(updateData)
            .eq('id', contact.id);

          // Update outreach_queue entry if one exists
          await supabase
            .from('outreach_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('contact_id', contact.id)
            .eq('status', 'pending');

          line.remaining--;
          line.sent_now++;
          sentCount++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Send failed for contact ${contact.id}:`, errMsg);
          errors.push({ contact_id: contact.id, message: errMsg });
        }
      }));
    }

    return NextResponse.json({
      data: {
        sent: sentCount,
        per_line: availableLines.map(l => ({
          line: l.number,
          label: l.label,
          sent: l.sent_now,
          remaining: l.remaining,
        })),
        errors,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error sending batch:', err);
    return NextResponse.json(
      { data: null, error: { message: 'Failed to send batch', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
