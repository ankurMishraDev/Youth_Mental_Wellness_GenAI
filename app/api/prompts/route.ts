/**
 * API Route: /api/prompts
 * GET: Fetch random daily prompts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRandomDailyPrompts } from '@/lib/firebase/journal';
import type { DailyPromptResponse } from '@/lib/types/journal';

/**
 * GET /api/prompts
 * Fetch random daily prompts for journaling inspiration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = searchParams.get('count') ? parseInt(searchParams.get('count')!) : 3;

    // Validate count
    if (count < 1 || count > 10) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 10' },
        { status: 400 }
      );
    }

    const prompts = await getRandomDailyPrompts(count);

    // Convert dates to ISO strings
    const response: DailyPromptResponse[] = prompts.map((prompt) => ({
      ...prompt,
      createdAt: prompt.createdAt.toISOString(),
    }));

    return NextResponse.json({ prompts: response }, { status: 200 });
  } catch (error) {
    console.error('GET /api/prompts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily prompts' },
      { status: 500 }
    );
  }
}
