import { NextRequest, NextResponse } from 'next/server';

const JOURNAL_AI_SERVER_URL = process.env.JOURNAL_AI_SERVER_URL || 'http://localhost:8766';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

/**
 * POST /api/journal/chat
 * Chat with AI about journal entries
 * AI has context of all user's entries and provides empathetic support
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

    const body: ChatRequest = await request.json();
    const { message, history = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Call Python AI server
    const response = await fetch(`${JOURNAL_AI_SERVER_URL}/journal-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: userId,
        message: message.trim(),
        history: history.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI server responded with ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      response: data.response,
      contextUsed: data.contextUsed,
      fallback: data.fallback || false
    });

  } catch (error) {
    console.error('POST /api/journal/chat error:', error);
    
    // Fallback response if AI server is down
    return NextResponse.json({
      success: true,
      response: "I'm here to support you. Could you tell me more about what's on your mind? I'd love to hear about your journal entries.",
      contextUsed: {
        entriesCount: 0,
        hasConversationHistory: false,
        historyLength: 0
      },
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
