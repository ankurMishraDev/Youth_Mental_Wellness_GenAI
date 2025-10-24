/**
 * API Route: /api/categorize
 * POST: Categorize journal entry content using Vertex AI
 * Enhanced to use user's available categories (defaults + custom)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStructuredContent } from '@/lib/genai';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { CategorizationRequest } from '@/lib/types/journal';

interface CategorizationResponse {
  categoryId: string;
  categoryTitle: string;
  color: string;
  reasoning: string;
  confidence: number;
}

interface Category {
  id: string;
  title: string;
  description: string | null;
  color: string;
  userId: string | null;
  isDefault: boolean;
}

/**
 * POST /api/categorize
 * Use Vertex AI to categorize journal entry based on available categories
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

    const body: CategorizationRequest = await request.json();
    const { title, content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Fetch user's available categories (defaults + custom separately)
    const categoriesRef = collection(db, 'categories');
    const [defaultSnapshot, customSnapshot] = await Promise.all([
      getDocs(query(categoriesRef, where('userId', '==', null))),
      getDocs(query(categoriesRef, where('userId', '==', userId)))
    ]);

    const defaultCategories: Category[] = defaultSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Category));

    const customCategories: Category[] = customSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Category));

    const categories = [...defaultCategories, ...customCategories];

    if (categories.length === 0) {
      return NextResponse.json(
        { error: 'No categories available. Please seed default categories first.' },
        { status: 400 }
      );
    }

    // Build category descriptions for AI
    const categoryDescriptions = categories.map(cat => 
      `- **${cat.title}** (ID: ${cat.id}): ${cat.description || 'No description'}`
    ).join('\n');

    // Build prompt for Gemini
    const prompt = `You are an AI assistant specialized in mental wellness and journaling. Your task is to analyze a journal entry and assign it to the most appropriate category from the user's available categories.

**Journal Entry:**
Title: ${title || 'Untitled'}
Content: ${content}

**Available Categories:**
${categoryDescriptions}

**Instructions:**
1. Carefully read the journal entry content and identify the main theme, emotion, or topic.
2. Match the entry to the BEST-FITTING category from the available categories above based on the category descriptions.
3. You MUST choose one of the existing category IDs - do NOT create new categories.
4. Return the exact category ID as listed above.
5. Provide a brief reasoning (1-2 sentences) explaining why this category was chosen.
6. Rate your confidence level from 0.0 to 1.0.

**Analysis Guidelines:**
- Consider the dominant theme or emotion in the entry
- Look for keywords and phrases that align with category descriptions
- If multiple categories could apply, choose the most specific or relevant one
- Focus on the main point of the entry, not minor details
- Consider the emotional tone and context

Respond in this exact JSON format:
{
  "categoryId": "exact-category-id-from-above",
  "reasoning": "Brief explanation of why this category fits best",
  "confidence": 0.85
}`;

    const schema = `{
  "categoryId": "string",
  "reasoning": "string",
  "confidence": "number (0-1)"
}`;

    const aiResult = await generateStructuredContent<{ categoryId: string; reasoning: string; confidence: number }>(prompt, schema);

    // Validate response and find the category
    const selectedCategory = categories.find(c => c.id === aiResult.categoryId);

    if (!selectedCategory) {
      // Fallback to first default category if AI returns invalid ID
      const fallbackCategory = categories.find(c => c.isDefault) || categories[0];
      
      return NextResponse.json({
        categoryId: fallbackCategory.id,
        categoryTitle: fallbackCategory.title,
        color: fallbackCategory.color,
        reasoning: 'AI categorization failed, using fallback category',
        confidence: 0.3,
      }, { status: 200 });
    }

    return NextResponse.json({
      categoryId: selectedCategory.id,
      categoryTitle: selectedCategory.title,
      color: selectedCategory.color,
      reasoning: aiResult.reasoning,
      confidence: Math.max(0, Math.min(1, aiResult.confidence || 0.7)),
    }, { status: 200 });

  } catch (error) {
    console.error('POST /api/categorize error:', error);
    
    // Fallback response - try to return first available category
    try {
      const userId = request.headers.get('x-user-id');
      if (userId) {
        const categoriesRef = collection(db, 'categories');
        const snapshot = await getDocs(
          query(categoriesRef, where('userId', '==', null), limit(1))
        );
        
        if (!snapshot.empty) {
          const fallbackCat = snapshot.docs[0];
          return NextResponse.json({
            categoryId: fallbackCat.id,
            categoryTitle: fallbackCat.data().title,
            color: fallbackCat.data().color,
            reasoning: 'Failed to automatically categorize. Using fallback.',
            confidence: 0,
          }, { status: 200 });
        }
      }
    } catch (fbError) {
      console.error('Fallback error:', fbError);
    }

    return NextResponse.json(
      {
        error: 'Failed to categorize entry',
        categoryId: null,
        categoryTitle: 'Uncategorized',
        color: '#6b7280',
        reasoning: 'Categorization failed',
        confidence: 0,
      },
      { status: 500 }
    );
  }
}
