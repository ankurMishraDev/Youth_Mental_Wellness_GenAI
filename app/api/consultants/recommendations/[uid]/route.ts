import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: {
    uid: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { uid } = context.params;

  console.log('🔵 Next.js API Route - Fetching recommendations for UID:', uid);

  try {
    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const url = `${dbServerUrl}/consultants/recommendations/${uid}`;
    
    console.log('🔵 Calling database server URL:', url);
    
    const response = await fetch(url);

    console.log('🔵 Database server response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 Database server error response:', errorText);
      throw new Error('Failed to fetch recommendations');
    }

    const data = await response.json();
    console.log('🔵 Database server response data:', JSON.stringify(data, null, 2));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('🔴 Error fetching recommendations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recommendations', has_recommendations: false, recommendations: [] },
      { status: 500 }
    );
  }
}