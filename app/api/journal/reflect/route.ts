import { NextRequest, NextResponse } from 'next/server';

const JOURNAL_AI_SERVER_URL = process.env.JOURNAL_AI_SERVER_URL || 'http://localhost:8766';

/**
 * POST /api/journal/reflect
 * Generate AI-powered reflection questions for a journal entry
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, mood } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Journal entry content is required' },
        { status: 400 }
      );
    }

    // Call Python AI server
    const response = await fetch(`${JOURNAL_AI_SERVER_URL}/generate-reflection-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: userId,
        entry: {
          title: title || 'Untitled',
          content,
          mood: mood || 'neutral',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate reflection questions');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      questions: data.questions || [],
      insight: data.insight || '',
      contextUsed: data.context_used || {},
    });

  } catch (error) {
    console.error('POST /api/journal/reflect error:', error);
    
    // Return fallback questions if AI server fails
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate reflection questions',
      questions: [
        'What feelings came up for you as you wrote this entry?',
        'How does this experience connect to other aspects of your life?',
        'What would support or healing look like for you in this situation?',
      ],
      insight: "I'm here to support your reflection journey.",
    }, { status: 200 }); // Return 200 with fallback questions instead of error
  }
}
