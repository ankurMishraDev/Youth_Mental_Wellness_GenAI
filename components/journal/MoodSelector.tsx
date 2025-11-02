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
      <label className="block text-sm font-medium text-foreground">
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
                    ? 'border-orange-500 shadow-lg scale-105 bg-orange-500/5'
                    : 'border-border hover:border-orange-500/50 bg-card'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-label={`Select mood: ${mood.label}`}
              data-selected={isSelected}
            >
              <span className="text-3xl mb-1">{mood.emoji}</span>
              <span className={`text-xs font-medium ${isSelected ? 'font-semibold text-orange-500' : 'text-muted-foreground'}`}>
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>
      {!value && (
        <p className="text-sm text-muted-foreground">
          Select a mood to continue
        </p>
      )}
    </div>
  );
}
