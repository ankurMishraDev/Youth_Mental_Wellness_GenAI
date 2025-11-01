import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const uid = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'text'; // 'text' or 'json'

    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call db-server export endpoint with format parameter
    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const response = await fetch(`${dbServerUrl}/export-user-data/${uid}?format=${format}`);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to export data' },
        { status: response.status }
      );
    }

    const result = await response.json();
    const exportData = result.data;
    const timestamp = new Date().toISOString().split('T')[0];

    // Debug logging
    console.log('[EXPORT API] Format requested:', format);
    console.log('[EXPORT API] Result format:', result.format);
    console.log('[EXPORT API] Export data type:', typeof exportData);
    console.log('[EXPORT API] Is string?', typeof exportData === 'string');
    console.log('[EXPORT API] Data preview:', typeof exportData === 'string' ? exportData.substring(0, 200) : JSON.stringify(exportData).substring(0, 200));

    if (format === 'text' || result.format === 'text') {
      // Return as downloadable text file
      return new NextResponse(exportData, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="curez-data-export-${timestamp}.txt"`,
        },
      });
    } else {
      // Return as downloadable JSON file
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="curez-data-export-${timestamp}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

