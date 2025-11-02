import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request_id, completion_notes, admin_secret } = body;

    if (!request_id) {
      return NextResponse.json(
        { error: 'Missing request_id' },
        { status: 400 }
      );
    }

    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const response = await fetch(`${dbServerUrl}/admin/complete-consultation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admin_secret: admin_secret || 'curez_admin_2025',
        request_id,
        completion_notes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to complete consultation' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error completing consultation:', error);
    return NextResponse.json(
      { error: 'Failed to complete consultation' },
      { status: 500 }
    );
  }
}
