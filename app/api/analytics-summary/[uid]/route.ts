import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;
    
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const DB_SERVER_URL = process.env.DB_SERVER_URL || 'http://localhost:3000';
    
    const response = await fetch(`${DB_SERVER_URL}/get-analytics-summary/${uid}`, { cache: 'no-store' });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics summary' },
      { status: 500 }
    );
  }
}
