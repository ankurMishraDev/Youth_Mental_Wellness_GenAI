'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/contexts/UserContext';
import { Tag } from 'lucide-react';

interface Category {
  id: string;
  title: string;
  color: string;
}

interface CategorySelectorProps {
  value: string | null;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}

export function CategorySelector({ value, onChange, disabled = false }: CategorySelectorProps) {
  const { user } = useUser();
  const userId = user?.uid;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId]);

  const fetchCategories = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/categories', {
        headers: {
          'x-user-id': userId,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Category
      </label>
      {loading ? (
        <div className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
          Loading categories...
        </div>
      ) : (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || categories.length === 0}
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-50"
          aria-label="Select a category"
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      )}
      {!value && (
        <p className="text-sm text-muted-foreground">
          Selecting a category is required.
        </p>
      )}
    </div>
  );
}
