import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { request_id: string } }
) {
  try {
    const { request_id } = params;
    const { searchParams } = new URL(request.url);
    const admin_secret = searchParams.get('admin_secret') || 'curez_admin_2025';

    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const url = `${dbServerUrl}/admin/consultation-shared-data/${request_id}?admin_secret=${admin_secret}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to download data' },
        { status: response.status }
      );
    }

    // Get the text content
    const textContent = await response.text();

    // Return as downloadable file
    return new NextResponse(textContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="consultation_data.txt"',
      },
    });
  } catch (error) {
    console.error('Error downloading consultation data:', error);
    return NextResponse.json(
      { error: 'Failed to download consultation data' },
      { status: 500 }
    );
  }
}
