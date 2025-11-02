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
    
    // Get limit from query params (default 100)
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    
    const response = await fetch(
      `${DB_SERVER_URL}/get-raw-metrics/${uid}?limit=${limit}`, 
      { cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error fetching raw metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch raw metrics' },
      { status: 500 }
    );
  }
}
