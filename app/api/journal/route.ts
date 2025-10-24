import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntries, createJournalEntry } from '@/lib/firebase/journal';
import { categorizeJournalEntry } from '@/lib/firebase/categorize';
import { portableTextToPlainText } from '@/lib/types/journal';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const entries = await getJournalEntries(userId);
    return NextResponse.json({ entries });

  } catch (error) {
    console.error('GET /api/journal error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}

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
    const { autoCategorize, ...entryData } = body;

    let categoryId = entryData.categoryId;
    if (autoCategorize && !categoryId) {
      try {
        const plainText = typeof entryData.content === 'string' 
          ? entryData.content 
          : portableTextToPlainText(entryData.content);
        
        const result = await categorizeJournalEntry(
          userId,
          entryData.title || '',
          plainText
        );
        
        if (result.categoryId) {
          categoryId = result.categoryId;
        }
      } catch (categorizationError) {
        console.warn('Auto-categorization failed:', categorizationError);
      }
    }

    const entry = await createJournalEntry(userId, {
      ...entryData,
      categoryId,
    });

    return NextResponse.json({ entry }, { status: 201 });

  } catch (error) {
    console.error('POST /api/journal error:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}
