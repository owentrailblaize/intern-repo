import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createChat, getRecipientService, sleep } from '@/lib/linq';
import { SENDING_LINES } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { data: null, error: { message: 'Server configuration error', code: 'CONFIG_ERROR' } },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { chapter_id, batch_size = 50 } = await request.json();

    if (!chapter_id) {
      return NextResponse.json(
        { data: null, error: { message: 'chapter_id is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const { data: contacts, error: fetchErr } = await supabase
      .from('alumni_contacts')
      .select('id, phone_primary, first_name, last_name')
      .eq('chapter_id', chapter_id)
      .not('phone_primary', 'is', null)
      .is('is_imessage', null)
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (fetchErr) {
      return NextResponse.json(
        { data: null, error: { message: fetchErr.message, code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        data: { total_checked: 0, imessage: 0, sms: 0, errors: 0 },
        error: null,
      });
    }

    const fromPhone = SENDING_LINES[0].phone;
    let imessageCount = 0;
    let smsCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      if (i > 0) await sleep(500);
      const batch = contacts.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (contact) => {
        try {
          const chat = await createChat(fromPhone, contact.phone_primary);
          const service = getRecipientService(chat);
          const isIMessage = service === 'iMessage';

          await supabase
            .from('alumni_contacts')
            .update({ is_imessage: isIMessage, linq_chat_id: chat.id })
            .eq('id', contact.id);

          if (isIMessage) imessageCount++;
          else smsCount++;
        } catch (err) {
          console.error(`Verify iMessage failed for contact ${contact.id}:`, err);
          errorCount++;
        }
      }));
    }

    return NextResponse.json({
      data: {
        total_checked: contacts.length,
        imessage: imessageCount,
        sms: smsCount,
        errors: errorCount,
      },
      error: null,
    });
  } catch (err) {
    console.error('Error verifying iMessage:', err);
    return NextResponse.json(
      { data: null, error: { message: 'Failed to verify iMessage eligibility', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
