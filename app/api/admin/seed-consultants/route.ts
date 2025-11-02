import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${dbServerUrl}/admin/seed-consultants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to seed consultants' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error seeding consultants:', error);
    return NextResponse.json(
      { error: 'Failed to seed consultants' },
      { status: 500 }
    );
  }
}
