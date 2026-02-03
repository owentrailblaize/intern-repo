import { NextRequest, NextResponse } from 'next/server';

// This endpoint parses deal/lead information from images or CSV/text
// Requires OPENAI_API_KEY in environment variables for image parsing

interface ParsedDeal {
  name: string;
  organization?: string;
  contact_name?: string;
  fraternity?: string;
  value?: number;
  email?: string;
  phone?: string;
  notes?: string;
  temperature?: 'hot' | 'warm' | 'cold';
}

const DEAL_EXTRACTION_PROMPT = `You are a sales lead extraction assistant for a Greek life/fraternity software company. Extract potential deal/lead information from the provided content.

Return a JSON object with a "deals" array. Each deal should have these fields:
- name (required): Deal name or contact name - if only a person's name is available, use "[Person Name] - Opportunity"
- organization: School/University name (e.g., "Ole Miss", "University of Alabama", "Texas A&M")
- contact_name: Primary contact person's name
- fraternity: Greek organization name (e.g., "Sigma Chi", "Pike", "Kappa Alpha", "SAE", "Phi Delt", "Beta", "Sigma Nu", "KA", "ATO", "Fiji"). Look for Greek letters, chapter names, or fraternity abbreviations.
- value: Estimated deal value in USD (number only, no currency symbol). Leave empty if unknown.
- email: Email address if available
- phone: Phone number if available
- notes: Any other relevant information (title, position like "President", "Rush Chair", "IFC", LinkedIn, etc)
- temperature: Lead temperature based on context - "hot" (highly interested, responded, meeting scheduled), "warm" (some engagement, potential), or "cold" (new lead, no prior contact). Default to "cold" if unsure.

Rules:
- Extract ALL potential leads/deals from the content
- If the content is a list of people, treat each person as a potential deal
- Pay special attention to Greek letters, fraternity names, chapter designations
- Look for university/school names and associate them with the organization field
- Be generous in interpretation - any contact could be a lead
- Only include fields that are clearly present
- Return {"deals": []} if no deals can be extracted

Example response:
{"deals": [{"name": "John Smith - Opportunity", "organization": "Ole Miss", "contact_name": "John Smith", "fraternity": "Sigma Chi", "value": 0, "email": "john@olemiss.edu", "notes": "Chapter President", "temperature": "warm"}]}`;

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
        fraternity: deal.fraternity || '',
        value: typeof deal.value === 'number' ? deal.value : 0,
        email: deal.email || '',
        phone: deal.phone || '',
        notes: deal.notes || '',
        temperature: (['hot', 'warm', 'cold'].includes(deal.temperature || '') ? deal.temperature : 'cold') as 'hot' | 'warm' | 'cold',
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
