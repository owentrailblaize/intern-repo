import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const HEADER_ALIASES: Record<string, string[]> = {
  first_name: ['first name', 'fname', 'first', 'firstname', 'given name', 'givenname'],
  last_name: ['last name', 'lname', 'last', 'lastname', 'surname', 'family name', 'familyname'],
  phone: ['phone', 'phone number', 'phonenumber', 'cell', 'cell phone', 'cellphone', 'mobile', 'telephone', 'tel'],
  email: ['email', 'email address', 'emailaddress', 'e-mail', 'mail'],
  year: ['year', 'grad year', 'graduation year', 'class year', 'class', 'initiation year', 'init year', 'grad', 'graduation'],
};

function matchHeader(raw: string): string | null {
  const normalized = raw.trim().toLowerCase().replace(/[_\-]/g, ' ');
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized) || normalized === field.replace('_', ' ')) {
      return field;
    }
  }
  return null;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) {
          rows.push(row);
        }
        row = [];
        current = '';
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }

  row.push(current.trim());
  if (row.some(cell => cell !== '')) {
    rows.push(row);
  }

  return rows;
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { data: null, error: { message: 'Database not connected', code: 'DB_ERROR' } },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const chapterId = formData.get('chapter_id') as string | null;

    if (!file || !chapterId) {
      return NextResponse.json(
        { data: null, error: { message: 'file and chapter_id are required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json(
        { data: null, error: { message: 'CSV must contain a header row and at least one data row', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const headerRow = rows[0];
    const columnMap: Record<number, string> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const field = matchHeader(headerRow[i]);
      if (field) {
        columnMap[i] = field;
      }
    }

    const hasFirstName = Object.values(columnMap).includes('first_name');
    const hasLastName = Object.values(columnMap).includes('last_name');
    if (!hasFirstName || !hasLastName) {
      return NextResponse.json(
        { data: null, error: { message: 'CSV must contain first_name and last_name columns', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('alumni_contacts')
      .select('phone')
      .eq('chapter_id', chapterId)
      .not('phone', 'is', null);

    const existingPhones = new Set((existing || []).map(c => c.phone));

    const toInsert: { chapter_id: string; first_name: string; last_name: string; phone: string | null; email: string | null; year: number | null }[] = [];
    const errors: { row: number; message: string }[] = [];
    let skipped = 0;
    let duplicates = 0;
    const seenPhones = new Set<string>();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const record: Record<string, string> = {};

      for (const [colIdx, field] of Object.entries(columnMap)) {
        const value = row[parseInt(colIdx)] || '';
        record[field] = value;
      }

      const firstName = record.first_name?.trim();
      const lastName = record.last_name?.trim();
      const rawPhone = record.phone?.trim() || '';
      const rawEmail = record.email?.trim() || '';
      const rawYear = record.year?.trim() || '';

      if (!firstName || !lastName) {
        errors.push({ row: r + 1, message: 'Missing first or last name' });
        skipped++;
        continue;
      }

      const phone = rawPhone ? normalizePhone(rawPhone) : null;
      const email = rawEmail || null;
      const year = rawYear ? parseInt(rawYear) : null;

      if (rawPhone && !phone) {
        errors.push({ row: r + 1, message: `Invalid phone number: ${rawPhone}` });
        skipped++;
        continue;
      }

      if (phone && existingPhones.has(phone)) {
        duplicates++;
        continue;
      }

      if (phone && seenPhones.has(phone)) {
        duplicates++;
        continue;
      }

      if (phone) {
        seenPhones.add(phone);
      }

      toInsert.push({ chapter_id: chapterId, first_name: firstName, last_name: lastName, phone, email, year: (year && year > 1900 && year < 2100) ? year : null });
    }

    let imported = 0;
    if (toInsert.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error: insertError, count } = await supabase
          .from('alumni_contacts')
          .insert(batch, { count: 'exact' });

        if (insertError) {
          errors.push({ row: 0, message: `Batch insert error: ${insertError.message}` });
        } else {
          imported += count ?? batch.length;
        }
      }
    }

    return NextResponse.json({
      data: { imported, skipped, duplicates, errors },
      error: null,
    });
  } catch (err) {
    console.error('Error importing alumni CSV:', err);
    return NextResponse.json(
      { data: null, error: { message: 'Failed to import CSV', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
