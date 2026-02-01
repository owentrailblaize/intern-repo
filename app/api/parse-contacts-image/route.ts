import { NextRequest, NextResponse } from 'next/server';

// This endpoint parses contact information from an image using AI
// Requires OPENAI_API_KEY in environment variables

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Image parsing not configured. Add OPENAI_API_KEY to enable this feature, or paste text manually.' },
        { status: 501 }
      );
    }

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a contact extraction assistant. Extract contact information from images containing lists of people, business cards, spreadsheets, or any other format.

Return a JSON object with a "contacts" array. Each contact should have these optional fields:
- name (required): Full name
- title: Job title or position
- organization: Company, school, or organization
- email: Email address
- phone: Phone number
- linkedin: LinkedIn URL or username
- notes: Any other relevant information

Only include fields that are clearly visible in the image. If you can't extract any contacts, return {"contacts": []}.

Example response:
{"contacts": [{"name": "John Smith", "title": "CEO", "organization": "Acme Inc", "email": "john@acme.com"}]}`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all contact information from this image. Return only valid JSON.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                },
              },
            ],
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
        { error: 'Failed to process image. Please try pasting the text manually.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI. Please try pasting the text manually.' },
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
      
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse extracted contacts. Please try pasting the text manually.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try pasting the text manually.' },
      { status: 500 }
    );
  }
}
