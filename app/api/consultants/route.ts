import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const response = await fetch(`${dbServerUrl}/consultants`);

    if (!response.ok) {
      throw new Error('Failed to fetch consultants');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching consultants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultants' },
      { status: 500 }
    );
  }
}
