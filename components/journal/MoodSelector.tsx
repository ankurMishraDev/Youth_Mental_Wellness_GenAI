/**
 * MoodSelector Component
 * Allows users to select their mood for a journal entry
 */

'use client';

import React from 'react';
import { MOOD_OPTIONS, type MoodType } from '@/lib/types/journal';

interface MoodSelectorProps {
  value: MoodType | null;
  onChange: (mood: MoodType) => void;
  disabled?: boolean;
}

export function MoodSelector({ value, onChange, disabled = false }: MoodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        How are you feeling?
      </label>
      <div className="flex flex-wrap gap-3">
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = value === mood.value;
          return (
            <button
              key={mood.value}
              type="button"
              onClick={() => onChange(mood.value)}
              disabled={disabled}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                min-w-[90px] hover:scale-105
                ${
                  isSelected
                    ? 'border-current shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-label={`Select mood: ${mood.label}`}
              data-selected={isSelected}
            >
              <span className="text-3xl mb-1">{mood.emoji}</span>
              <span className={`text-xs font-medium ${isSelected ? 'font-semibold' : ''}`}>
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>
      {!value && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a mood to continue
        </p>
      )}
    </div>
  );
}
