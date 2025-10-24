/**
 * API Route: /api/categorize
 * POST: Categorize journal entry content using Vertex AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStructuredContent } from '@/lib/genai';
import type { CategorizationRequest } from '@/lib/types/journal';

interface CategorizationResponse {
  category: string;
  color: string;
  reasoning: string;
  confidence: number;
  description?: string;
}

/**
 * POST /api/categorize
 * Use Vertex AI to categorize journal entry
 */
export async function POST(request: NextRequest) {
  try {
    const body: CategorizationRequest = await request.json();
    const { title, content, existingCategories } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Build prompt for Gemini
    const prompt = `You are an AI assistant specialized in mental wellness and journaling. Your task is to categorize a journal entry into the most appropriate category.

**Journal Entry:**
Title: ${title || 'Untitled'}
Content: ${content}

**Existing Categories:** ${existingCategories && existingCategories.length > 0 ? existingCategories.join(', ') : 'None'}

**Instructions:**
1. If the entry fits well into one of the existing categories, return that category name exactly as written.
2. If no existing category fits well, suggest a new category name that best represents the main theme or emotion of the entry.
3. Choose a color in hex format that represents the emotional tone or theme (e.g., blue for calm, yellow for joy, gray for reflection).
4. Provide a brief reasoning (1-2 sentences) explaining why this category was chosen.
5. Rate your confidence level from 0.0 to 1.0.

**Common mental wellness categories to consider:**
- Anxiety & Stress
- Depression & Sadness
- Joy & Gratitude
- Relationships
- Work & Career
- Self-Reflection
- Personal Growth
- Physical Health
- Sleep & Rest
- Goals & Achievements
- Challenges & Obstacles
- Family
- Friendships
- Hobbies & Interests
- Spirituality & Mindfulness

**Color Guidelines:**
- Red (#ef4444): Anger, frustration, urgent stress
- Orange (#f97316): Energy, motivation, activity
- Yellow (#eab308): Joy, happiness, positivity
- Green (#22c55e): Growth, health, calm
- Blue (#3b82f6): Reflection, peace, stability
- Purple (#a855f7): Creativity, spirituality, dreams
- Pink (#ec4899): Love, relationships, compassion
- Gray (#6b7280): Neutral, contemplation, uncertainty
- Teal (#14b8a6): Balance, wellness, healing

Respond in this exact JSON format:
{
  "category": "Category Name",
  "color": "#hexcode",
  "reasoning": "Brief explanation of categorization",
  "confidence": 0.85,
  "description": "Optional brief description of what this category represents"
}`;

    const schema = `{
  "category": "string",
  "color": "string (hex color)",
  "reasoning": "string",
  "confidence": "number (0-1)",
  "description": "string (optional)"
}`;

    const result = await generateStructuredContent<CategorizationResponse>(prompt, schema);

    // Validate response
    if (!result.category || !result.color) {
      throw new Error('Invalid categorization response');
    }

    // Ensure confidence is between 0 and 1
    result.confidence = Math.max(0, Math.min(1, result.confidence || 0.7));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('POST /api/categorize error:', error);
    
    // Fallback response
    return NextResponse.json(
      {
        category: 'Uncategorized',
        color: '#6b7280',
        reasoning: 'Failed to automatically categorize. You can manually assign a category later.',
        confidence: 0,
      },
      { status: 200 } // Return 200 with fallback instead of error
    );
  }
}
