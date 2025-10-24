/**
 * JournalEntryCard Component
 * Display card for journal entry in list view
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Tag, Image as ImageIcon, Trash2 } from 'lucide-react';
import { MOOD_OPTIONS, getMoodConfig, portableTextToPlainText } from '@/lib/types/journal';
import type { JournalEntry } from '@/lib/types/journal';

interface JournalEntryCardProps {
  entry: JournalEntry;
  onDelete?: () => void;
}

export function JournalEntryCard({ entry, onDelete }: JournalEntryCardProps) {
  const router = useRouter();
  const mood = getMoodConfig(entry.mood);
  
  // Extract first paragraph as preview
  const preview = portableTextToPlainText(entry.content).substring(0, 200);

  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  function handleClick() {
    router.push(`/journal/${entry.id}`);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  }

  return (
    <div
      onClick={handleClick}
      className="group block p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-all hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {mood && (
            <span className="text-3xl" title={mood.label}>
              {mood.emoji}
            </span>
          )}
          <div className="flex-1">
            {entry.title && (
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                {entry.title}
              </h3>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{dateStr}</span>
              </div>
              {entry.images.length > 0 && (
                <div className="flex items-center gap-1">
                  <ImageIcon size={12} />
                  <span>{entry.images.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            title="Delete entry"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Preview */}
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
        {preview}
        {preview.length >= 200 && '...'}
      </p>

      {/* Footer with mood badge */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: mood.color + '20',
            color: mood.color,
          }}
        >
          {mood.label}
        </div>
        {entry.categoryId && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Tag size={12} />
            <span>Categorized</span>
          </div>
        )}
      </div>
    </div>
  );
}
