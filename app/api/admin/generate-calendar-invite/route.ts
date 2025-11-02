import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      request_id, 
      meeting_date, 
      meeting_time, 
      duration_minutes,
      meeting_link,
      admin_secret 
    } = body;

    if (!request_id || !meeting_date || !meeting_time || !duration_minutes || !meeting_link) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const response = await fetch(`${dbServerUrl}/admin/generate-calendar-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admin_secret: admin_secret || 'curez_admin_2025',
        request_id,
        meeting_date,
        meeting_time,
        duration_minutes,
        meeting_link,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to generate calendar invite' },
        { status: response.status }
      );
    }

    // Get the .ics file content
    const icsContent = await response.text();

    // Return as downloadable file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="consultation.ics"',
      },
    });
  } catch (error) {
    console.error('Error generating calendar invite:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar invite' },
      { status: 500 }
    );
  }
}
