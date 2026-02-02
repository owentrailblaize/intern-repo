import { NextRequest, NextResponse } from 'next/server';

// This endpoint parses deal/lead information from images or CSV/text
// Requires OPENAI_API_KEY in environment variables for image parsing

interface ParsedDeal {
  name: string;
  organization?: string;
  contact_name?: string;
  value?: number;
  email?: string;
  phone?: string;
  notes?: string;
}

const DEAL_EXTRACTION_PROMPT = `You are a sales lead extraction assistant. Extract potential deal/lead information from the provided content.

Return a JSON object with a "deals" array. Each deal should have these fields:
- name (required): Deal name or company name - if only a person's name is available, use "[Person Name] - Opportunity"
- organization: Company or organization name
- contact_name: Primary contact person's name
- value: Estimated deal value in USD (number only, no currency symbol). Leave empty if unknown.
- email: Email address if available
- phone: Phone number if available
- notes: Any other relevant information (title, LinkedIn, how you met, etc)

Rules:
- Extract ALL potential leads/deals from the content
- If the content is a list of people, treat each person as a potential deal
- Be generous in interpretation - any business contact could be a lead
- Only include fields that are clearly present
- Return {"deals": []} if no deals can be extracted

Example response:
{"deals": [{"name": "Acme Corp Partnership", "organization": "Acme Corp", "contact_name": "John Smith", "value": 50000, "email": "john@acme.com", "notes": "CEO, met at conference"}]}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, text } = body;

    if (!image && !text) {
      return NextResponse.json(
        { error: 'No image or text provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables.' },
        { status: 501 }
      );
    }

    // Build the message content based on input type
    const userContent = image
      ? [
          {
            type: 'text',
            text: 'Extract all potential deals/leads from this image. This could be a spreadsheet, business cards, a list of contacts, or any business-related content. Return only valid JSON.',
          },
          {
            type: 'image_url',
            image_url: { url: image },
          },
        ]
      : [
          {
            type: 'text',
            text: `Extract all potential deals/leads from this text content. Return only valid JSON.\n\nContent:\n${text}`,
          },
        ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: image ? 'gpt-4o-mini' : 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: DEAL_EXTRACTION_PROMPT,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to process content. Please try again or enter deals manually.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI. Please try again or enter deals manually.' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as { deals: ParsedDeal[] };
      
      // Validate and clean the parsed deals
      const cleanedDeals = (parsed.deals || []).map((deal: ParsedDeal) => ({
        name: deal.name || 'Unknown Deal',
        organization: deal.organization || '',
        contact_name: deal.contact_name || '',
        value: typeof deal.value === 'number' ? deal.value : 0,
        email: deal.email || '',
        phone: deal.phone || '',
        notes: deal.notes || '',
      }));

      return NextResponse.json({ deals: cleanedDeals });
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse extracted deals. Please try again or enter deals manually.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing content:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again or enter deals manually.' },
      { status: 500 }
    );
  }
}
