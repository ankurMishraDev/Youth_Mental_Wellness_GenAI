import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, recommendation_id, dismiss_reason } = body;

    if (!uid || !recommendation_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const response = await fetch(`${dbServerUrl}/consultants/dismiss-recommendation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, recommendation_id, dismiss_reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to dismiss recommendation' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error dismissing recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss recommendation' },
      { status: 500 }
    );
  }
}
