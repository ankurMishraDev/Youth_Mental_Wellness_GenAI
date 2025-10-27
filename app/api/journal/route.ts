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

    // Extract metrics from journal entry (background process)
    try {
      const plainText = typeof entryData.content === 'string' 
        ? entryData.content 
        : portableTextToPlainText(entryData.content);

      // Call Python AI server to extract metrics
      const JOURNAL_AI_SERVER_URL = process.env.JOURNAL_AI_SERVER_URL || 'http://localhost:8766';
      
      const metricsResponse = await fetch(`${JOURNAL_AI_SERVER_URL}/extract-journal-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userId,
          entry: {
            id: entry,
            title: entryData.title || 'Untitled',
            mood: entryData.mood,
            content_text: plainText,
            reflection_qa: null  // TODO: Add when reflection feature is implemented
          }
        })
      });

      if (metricsResponse.ok) {
        const { metrics, summary } = await metricsResponse.json();

        // Save metrics to Firestore via db-server (always done)
        const DB_SERVER_URL = process.env.DB_SERVER_URL || 'http://localhost:3000';
        
        await fetch(`${DB_SERVER_URL}/save-journal-metrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: userId,
            entryId: entry,
            metrics
          })
        });

        console.log(`✅ Metrics extracted and saved for journal entry ${entry}`);

        // Save summary only if confidence >= 0.65 (conditional)
        if (summary && summary.summary_generated) {
          const summaryResponse = await fetch(`${DB_SERVER_URL}/save-journal-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: userId,
              entryId: entry,
              summary: {
                ...summary,
                mood_emoji: entryData.mood,
                title: entryData.title || 'Untitled'
              }
            })
          });

          if (summaryResponse.ok) {
            const summaryResult = await summaryResponse.json();
            if (summaryResult.stored) {
              console.log(`✅ Journal summary stored (confidence: ${summary.confidence}, category: ${summary.value_category})`);
            } else {
              console.log(`⏭️  Summary not stored (confidence: ${summary.confidence} < 0.65)`);
            }
          }
        } else {
          console.log(`⏭️  Summary skipped: ${summary?.reasoning || 'No summary generated'}`);
        }
      } else {
        console.warn('Metrics extraction failed, but entry was saved');
      }
    } catch (metricsError) {
      // Don't fail the entire request if metrics extraction fails
      console.error('Failed to extract metrics:', metricsError);
    }

    return NextResponse.json({ entry }, { status: 201 });

  } catch (error) {
    console.error('POST /api/journal error:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}
