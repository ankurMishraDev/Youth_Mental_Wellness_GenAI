import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${dbServerUrl}/consultants/submit-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to submit request' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error submitting consultation request:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
