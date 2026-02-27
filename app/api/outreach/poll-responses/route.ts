import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getMessages, sleep } from '@/lib/linq';
import { SENDING_LINES } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OUR_PHONES = new Set<string>(SENDING_LINES.map(l => l.phone));

type Classification = 'confirmed' | 'wrong_number' | 'declined' | 'signed_up' | 'question';

function classifyResponse(text: string): Classification {
  const lower = text.toLowerCase().trim();

  const wrongPatterns = /\b(wrong|not me|not this person|mother|father|deceased|passed away|passed|who is this)\b/i;
  if (wrongPatterns.test(lower)) return 'wrong_number';

  const declinePatterns = /\b(stop|remove|unsubscribe|not interested|no thanks|don't text|dont text|leave me alone|opt out)\b/i;
  if (declinePatterns.test(lower)) return 'declined';

  const signedUpPatterns = /\b(signed up|just signed|done|registered|joined)\b/i;
  if (signedUpPatterns.test(lower)) return 'signed_up';

  const confirmPatterns = /\b(yes|yeah|yep|yessir|this is|correct|sure|that's me|thats me|ya|yea)\b/i;
  if (confirmPatterns.test(lower)) return 'confirmed';

  if (lower.includes('?')) return 'question';

  return 'confirmed';
}

function classificationToOutreachStatus(classification: Classification, hasTouchTwo: boolean): string {
  switch (classification) {
    case 'confirmed': return hasTouchTwo ? 'responded' : 'verified';
    case 'wrong_number': return 'wrong_number';
    case 'declined': return 'opted_out';
    case 'signed_up': return 'signed_up';
    case 'question': return 'responded';
  }
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
    const { chapter_id, batch_size = 100 } = await request.json();

    if (!chapter_id) {
      return NextResponse.json(
        { data: null, error: { message: 'chapter_id is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const { data: contacts, error: fetchErr } = await supabase
      .from('alumni_contacts')
      .select('id, linq_chat_id, last_response_at, touch2_sent_at, outreach_status')
      .eq('chapter_id', chapter_id)
      .not('linq_chat_id', 'is', null)
      .not('outreach_status', 'in', '("signed_up","wrong_number","opted_out")')
      .order('last_response_at', { ascending: true, nullsFirst: true })
      .limit(batch_size);

    if (fetchErr) {
      return NextResponse.json(
        { data: null, error: { message: fetchErr.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        data: { polled: 0, new_responses: 0, by_classification: {} },
        error: null,
      });
    }

    let newResponses = 0;
    const byClassification: Record<string, number> = {};
    const POLL_BATCH = 10;

    for (let i = 0; i < contacts.length; i += POLL_BATCH) {
      if (i > 0) await sleep(500);
      const batch = contacts.slice(i, i + POLL_BATCH);

      await Promise.all(batch.map(async (contact) => {
        try {
          const messages = await getMessages(contact.linq_chat_id!, 20);

          // Find inbound messages (not from our lines)
          const inbound = messages.filter(m => !OUR_PHONES.has(m.from));

          if (inbound.length === 0) return;

          // Find new inbound messages (after last_response_at, or all if null)
          const newInbound = contact.last_response_at
            ? inbound.filter(m => m.created_at > contact.last_response_at!)
            : inbound;

          if (newInbound.length === 0) return;

          const latest = newInbound.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          const responseText = latest.parts
            .filter(p => p.type === 'text')
            .map(p => p.value)
            .join(' ')
            .slice(0, 500);

          const classification = classifyResponse(responseText);
          const hasTouchTwo = !!contact.touch2_sent_at;
          const newStatus = classificationToOutreachStatus(classification, hasTouchTwo);

          await supabase
            .from('alumni_contacts')
            .update({
              last_response_at: latest.created_at,
              response_text: responseText,
              response_classification: classification,
              outreach_status: newStatus,
            })
            .eq('id', contact.id);

          newResponses++;
          byClassification[classification] = (byClassification[classification] || 0) + 1;
        } catch (err) {
          console.error(`Poll responses failed for contact ${contact.id}:`, err);
        }
      }));
    }

    return NextResponse.json({
      data: {
        polled: contacts.length,
        new_responses: newResponses,
        by_classification: byClassification,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error polling responses:', err);
    return NextResponse.json(
      { data: null, error: { message: 'Failed to poll responses', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
