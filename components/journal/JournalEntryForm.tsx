/**
 * JournalEntryForm Component
 * Complete form for creating/editing journal entries
 */

'use client';

import React, { useState } from 'react';
import { MoodSelector } from './MoodSelector';
import { RichTextEditor } from './RichTextEditor';
import { ImageUploader } from './ImageUploader';
import { Loader2, Save, Sparkles } from 'lucide-react';
import type {
  MoodType,
  PortableTextBlock,
  JournalImage,
  CreateJournalEntryInput,
} from '@/lib/types/journal';

interface JournalEntryFormProps {
  userId: string;
  initialData?: {
    title?: string;
    content: PortableTextBlock[];
    mood: MoodType;
    images: JournalImage[];
  };
  onSubmit: (data: CreateJournalEntryInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isEditing?: boolean;
}

export function JournalEntryForm({
  userId,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Entry',
  isEditing = false,
}: JournalEntryFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState<PortableTextBlock[]>(
    initialData?.content || []
  );
  const [mood, setMood] = useState<MoodType | null>(initialData?.mood || null);
  const [images, setImages] = useState<JournalImage[]>(initialData?.images || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mood) {
      setError('Please select your mood');
      return;
    }

    if (content.length === 0 || !content[0].children?.[0]?.text) {
      setError('Please write something in your journal');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim() || undefined,
        content,
        mood,
        images,
      });
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to save journal entry');
      setIsSubmitting(false);
    }
  };

  const isValid = mood !== null && content.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Title (Optional) */}
      <div className="space-y-2">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Title (Optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your entry a title..."
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          disabled={isSubmitting}
          maxLength={100}
        />
      </div>

      {/* Mood Selector */}
      <MoodSelector value={mood} onChange={setMood} disabled={isSubmitting} />

      {/* Content Editor */}
      <RichTextEditor
        value={content}
        onChange={setContent}
        disabled={isSubmitting}
      />

      {/* Image Uploader */}
      <ImageUploader
        userId={userId}
        images={images}
        onChange={setImages}
        disabled={isSubmitting}
      />

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>{submitLabel}</span>
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Sparkles size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">AI Auto-Categorization</p>
            <p className="text-blue-600 dark:text-blue-400">
              Your entry will be automatically categorized using AI to help you track themes and patterns.
            </p>
          </div>
        </div>
      )}
    </form>
  );
}
