import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, checkinId, response: userResponse } = body;
    
    if (!uid || !checkinId) {
      return NextResponse.json({ error: 'Missing uid or checkinId' }, { status: 400 });
    }

    const DB_SERVER_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${DB_SERVER_URL}/dashboard/complete-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, checkinId, response: userResponse }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error completing check-in:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete check-in' },
      { status: 500 }
    );
  }
}
