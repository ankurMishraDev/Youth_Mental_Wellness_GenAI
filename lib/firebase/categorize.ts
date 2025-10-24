/**
 * AI-powered journal entry categorization using Vertex AI
 */

import { getCategories, createCategory, getCategoryById } from './journal';
import type { CategorizationResult, CategorizationRequest, Category } from '../types/journal';

/**
 * Categorize a journal entry using AI
 * 
 * @param userId - User ID to check for custom categories
 * @param title - Entry title (optional)
 * @param content - Entry content (plain text)
 * @returns Categorization result with category ID and reasoning
 */
export async function categorizeJournalEntry(
  userId: string,
  title: string | undefined,
  content: string
): Promise<CategorizationResult> {
  try {
    // Call AI categorization API (it will fetch available categories internally)
    const response = await fetch('/api/categorize', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId 
      },
      body: JSON.stringify({
        title,
        content,
      } as CategorizationRequest),
    });

    if (!response.ok) {
      throw new Error('Categorization API failed');
    }

    const aiResult = await response.json();

    return {
      categoryId: aiResult.categoryId,
      categoryTitle: aiResult.categoryTitle,
      categoryColor: aiResult.color,
      reasoning: aiResult.reasoning || 'AI categorization',
      action: 'matched',
      confidence: aiResult.confidence || 0.7,
    };
  } catch (error) {
    console.error('Error categorizing entry:', error);
    
    // Fallback: return first available category
    const categories = await getCategories(userId);
    const fallback = categories[0];

    if (!fallback) {
      // No categories available - return error state
      return {
        categoryId: '',
        categoryTitle: 'Uncategorized',
        categoryColor: '#6b7280',
        reasoning: 'No categories available',
        action: 'matched',
        confidence: 0,
      };
    }

    return {
      categoryId: fallback.id,
      categoryTitle: fallback.title,
      categoryColor: fallback.color,
      reasoning: 'Failed to categorize, using fallback',
      action: 'matched',
      confidence: 0,
    };
  }
}

/**
 * Generate a random color for new categories
 */
function generateRandomColor(): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Batch categorize multiple entries (for initial setup or re-categorization)
 */
export async function batchCategorizeEntries(
  userId: string,
  entries: Array<{ id: string; title?: string; content: string }>
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  for (const entry of entries) {
    try {
      const result = await categorizeJournalEntry(userId, entry.title, entry.content);
      results.set(entry.id, result);
    } catch (error) {
      console.error(`Failed to categorize entry ${entry.id}:`, error);
    }
  }

  return results;
}
