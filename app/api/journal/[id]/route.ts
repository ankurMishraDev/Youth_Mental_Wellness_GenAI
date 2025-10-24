import { NextRequest, NextResponse } from 'next/server';
import { 
  getJournalEntryById, 
  updateJournalEntry, 
  deleteJournalEntry 
} from '@/lib/firebase/journal';
import { categorizeJournalEntry } from '@/lib/firebase/categorize';
import { portableTextToPlainText } from '@/lib/types/journal';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const entry = await getJournalEntryById(userId, params.id);
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ entry });

  } catch (error) {
    console.error('GET /api/journal/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { autoCategorize, ...updates } = body;

    let categoryId = updates.categoryId;
    if (autoCategorize && !categoryId) {
      try {
        const plainText = typeof updates.content === 'string' 
          ? updates.content 
          : portableTextToPlainText(updates.content);
        
        const result = await categorizeJournalEntry(
          userId,
          updates.title || '',
          plainText
        );
        
        if (result.categoryId) {
          categoryId = result.categoryId;
        }
      } catch (categorizationError) {
        console.warn('Auto-categorization failed:', categorizationError);
      }
    }

    await updateJournalEntry(userId, params.id, {
      ...updates,
      categoryId,
    });

    const updatedEntry = await getJournalEntryById(userId, params.id);

    return NextResponse.json({ entry: updatedEntry });

  } catch (error) {
    console.error('PUT /api/journal/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update journal entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    await deleteJournalEntry(userId, params.id);
    
    return NextResponse.json(
      { message: 'Journal entry deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE /api/journal/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete journal entry' },
      { status: 500 }
    );
  }
}