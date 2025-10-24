/**
 * RichTextEditor Component
 * Simple rich text editor for journal entries
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { PortableTextBlock, PortableTextSpan } from '@/lib/types/journal';
import { Bold, Italic, Heading2, List, Quote } from 'lucide-react';

interface RichTextEditorProps {
  value: PortableTextBlock[];
  onChange: (value: PortableTextBlock[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your thoughts...',
  disabled = false,
}: RichTextEditorProps) {
  const [text, setText] = useState(() => {
    // Convert PortableText to plain text for editing
    return value
      .map((block) => {
        if (block._type === 'block' && block.children) {
          return block.children.map((child) => child.text).join('');
        }
        return '';
      })
      .join('\n\n');
  });

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);

      // Convert plain text to PortableText blocks
      const blocks: PortableTextBlock[] = newText
        .split('\n\n')
        .filter((paragraph) => paragraph.trim())
        .map((paragraph) => ({
          _type: 'block' as const,
          _key: Math.random().toString(36).substring(7),
          style: 'normal' as const,
          children: [
            {
              _type: 'span' as const,
              _key: Math.random().toString(36).substring(7),
              text: paragraph,
              marks: [],
            },
          ],
        }));

      onChange(blocks.length > 0 ? blocks : [createEmptyBlock()]);
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Your Journal Entry
      </label>
      
      {/* Simple toolbar for future enhancements */}
      <div className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Bold (coming soon)"
          disabled
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Italic (coming soon)"
          disabled
        >
          <Italic size={18} />
        </button>
        <button
          type="button"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Heading (coming soon)"
          disabled
        >
          <Heading2 size={18} />
        </button>
        <button
          type="button"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="List (coming soon)"
          disabled
        >
          <List size={18} />
        </button>
        <button
          type="button"
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Quote (coming soon)"
          disabled
        >
          <Quote size={18} />
        </button>
      </div>

      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={12}
        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {text.length} characters • {text.split(/\s+/).filter(Boolean).length} words
      </p>
    </div>
  );
}

// Helper function to create an empty block
function createEmptyBlock(): PortableTextBlock {
  return {
    _type: 'block',
    _key: Math.random().toString(36).substring(7),
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: Math.random().toString(36).substring(7),
        text: '',
        marks: [],
      },
    ],
  };
}
