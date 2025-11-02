import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: {
    uid: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { uid } = context.params;

  try {
    const dbServerUrl = process.env.DATABASE_SERVICE_URL || 'http://localhost:3000';
    const response = await fetch(`${dbServerUrl}/consultants/recommendations/${uid}`);

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
