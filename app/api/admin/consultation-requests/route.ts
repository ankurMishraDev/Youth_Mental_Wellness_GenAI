import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const admin_secret = searchParams.get('admin_secret');
    const status = searchParams.get('status');

    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const url = new URL(`${dbServerUrl}/admin/consultation-requests`);
    url.searchParams.set('admin_secret', admin_secret || 'curez_admin_2025');
    if (status) url.searchParams.set('status', status);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch requests' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching consultation requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
