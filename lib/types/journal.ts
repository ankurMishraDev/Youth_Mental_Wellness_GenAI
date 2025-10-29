/**
 * Journal-related type definitions
 */

// ========================================
// MOOD TYPES
// ========================================

export type MoodType = 'very-sad' | 'sad' | 'neutral' | 'happy' | 'very-happy';

export interface MoodOption {
  value: MoodType;
  label: string;
  emoji: string;
  color: string;
}

// ========================================
// PORTABLE TEXT (Rich Text Format)
// ========================================

export interface PortableTextSpan {
  _type: 'span';
  _key: string;
  text: string;
  marks?: ('strong' | 'em' | 'code' | 'underline')[];
}

export interface PortableTextBlock {
  _type: 'block' | 'image';
  _key: string;
  style?: 'normal' | 'h1' | 'h2' | 'h3' | 'blockquote';
  children?: PortableTextSpan[];
  // For image blocks
  imageUrl?: string;
  alt?: string;
  caption?: string;
}

// ========================================
// JOURNAL ENTRY
// ========================================

export interface JournalImage {
  url: string; // Firebase Storage URL
  caption?: string;
  alt?: string;
  storagePath: string; // For deletion (e.g., "journal-images/userId/filename.jpg")
}

export interface JournalEntry {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  title?: string;
  content: PortableTextBlock[]; // Rich text content
  mood: MoodType;
  images: JournalImage[];
  categoryId?: string; // Reference to category
  createdAt: Date;
  updatedAt: Date;
}

// For API responses
export interface JournalEntryResponse extends Omit<JournalEntry, 'createdAt' | 'updatedAt'> {
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// For creating new entries
export interface CreateJournalEntryInput {
  title?: string;
  content: PortableTextBlock[];
  mood: MoodType;
  images?: JournalImage[];
  categoryId?: string;
}

// For updating entries
export interface UpdateJournalEntryInput {
  title?: string;
  content?: PortableTextBlock[];
  mood?: MoodType;
  images?: JournalImage[];
  categoryId?: string;
}

// ========================================
// CATEGORIES
// ========================================

export interface Category {
  id: string;
  title: string;
  color: string; // Hex color (e.g., "#6366f1")
  description?: string;
  userId?: string | null; // null for system categories, userId for custom
  createdAt?: Date;
}

export interface CategoryResponse extends Omit<Category, 'createdAt'> {
  createdAt?: string;
}

// ========================================
// DAILY PROMPTS
// ========================================

export interface DailyPrompt {
  id: string;
  title: string;
  prompt: string;
  emoji?: string;
  categoryId?: string;
  suggestedMood?: MoodType;
  active: boolean;
  weight: number; // 1-10 for random selection (higher = more likely)
  tags?: string[];
  createdAt: Date;
}

export interface DailyPromptResponse extends Omit<DailyPrompt, 'createdAt'> {
  createdAt: string;
}

// ========================================
// AI CATEGORIZATION
// ========================================

export interface CategorizationResult {
  categoryId: string;
  categoryTitle: string;
  categoryColor?: string;
  reasoning: string;
  action: 'matched' | 'created'; // Whether existing category matched or new one created
  confidence?: number; // 0-1
}

export interface CategorizationRequest {
  title?: string;
  content: string; // Plain text extracted from PortableText
  existingCategories: string[]; // Array of category titles
}

// ========================================
// JOURNAL SUMMARIES (for AI context)
// ========================================

export interface JournalEntrySummary {
  id: string;
  date: string; // Human-readable date
  mood: MoodType;
  summary: string; // AI-generated 2-3 sentence summary
  categories: string[]; // Category titles
  title?: string;
}

// ========================================
// MOOD TRENDS (for analytics)
// ========================================

export interface MoodTrend {
  period: string; // "last_7_days", "last_30_days", etc.
  averageMood: number; // -2 to +2
  trend: 'improving' | 'declining' | 'stable';
  significantEvents?: string[];
  data?: Array<{ date: string; mood: number }>; // For charting
}

// ========================================
// USER CONTEXT (for AI sessions)
// ========================================

export interface UserContextProfile {
  name: string;
  age?: number;
  preferredTopics?: string[];
  avoidanceTopics?: string[];
  communicationStyle?: 'supportive' | 'direct' | 'coaching';
}

export interface ConversationContext {
  recentJournalEntries: JournalEntrySummary[];
  moodTrends: MoodTrend[];
  recurringThemes: string[];
  previousSessionSummaries: string[];
  userProfile: UserContextProfile;
}

// ========================================
// CHAT SESSIONS
// ========================================

export interface ChatSession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  
  // Compressed summary only (no full transcript)
  summary?: string; // AI-generated, 3-5 sentences
  
  // Structured metadata
  topicsDiscussed: string[]; // ["anxiety", "work", "sleep"]
  moodAtStart?: MoodType;
  moodAtEnd?: MoodType;
  
  // Actionable insights
  actionItems?: string[]; // ["Journal about work situation", "Try meditation"]
  
  // Connections
  journalEntriesReferenced: string[]; // IDs of entries discussed
}

export interface ChatSessionResponse extends Omit<ChatSession, 'startedAt' | 'endedAt'> {
  startedAt: string;
  endedAt?: string;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Convert mood to numeric value for calculations
 */
export function moodToNumber(mood: MoodType): number {
  const mapping: Record<MoodType, number> = {
    'very-sad': -2,
    'sad': -1,
    'neutral': 0,
    'happy': 1,
    'very-happy': 2,
  };
  return mapping[mood] || 0;
}

/**
 * Extract plain text from PortableText blocks
 */
export function portableTextToPlainText(blocks: PortableTextBlock[] | any): string {
  // Safety checks for invalid input
  if (!blocks) return '';
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';
  if (blocks.length === 0) return '';

  return blocks
    .map((block) => {
      if (block._type === 'block' && block.children) {
        return block.children.map((child: PortableTextSpan) => child.text).join('');
      }
      return '';
    })
    .join('\n\n');
}

/**
 * Create a simple text-only PortableText block
 */
export function createTextBlock(text: string, style: 'normal' | 'h1' | 'h2' | 'h3' = 'normal'): PortableTextBlock {
  return {
    _type: 'block',
    _key: Math.random().toString(36).substring(7),
    style,
    children: [
      {
        _type: 'span',
        _key: Math.random().toString(36).substring(7),
        text,
        marks: [],
      },
    ],
  };
}

/**
 * Mood options for UI components
 */
export const MOOD_OPTIONS: MoodOption[] = [
  {
    value: 'very-sad',
    label: 'Very Sad',
    emoji: '😢',
    color: '#ef4444', // red-500
  },
  {
    value: 'sad',
    label: 'Sad',
    emoji: '😔',
    color: '#f97316', // orange-500
  },
  {
    value: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    color: '#6b7280', // gray-500
  },
  {
    value: 'happy',
    label: 'Happy',
    emoji: '😊',
    color: '#22c55e', // green-500
  },
  {
    value: 'very-happy',
    label: 'Very Happy',
    emoji: '😄',
    color: '#3b82f6', // blue-500
  },
];

/**
 * Get mood configuration by mood value
 */
export function getMoodConfig(mood: MoodType): MoodOption {
  return MOOD_OPTIONS.find((m) => m.value === mood) || MOOD_OPTIONS[2]; // Default to neutral
}
