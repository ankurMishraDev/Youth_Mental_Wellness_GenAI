/**
 * View Journal Entry Page
 * Beautiful display of a single journal entry
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';
import { ArrowLeft, Edit2, Trash2, Loader2, Calendar, Tag, ImageIcon } from 'lucide-react';
import type { JournalEntry } from '@/lib/types/journal';
import { getMoodConfig, portableTextToPlainText } from '@/lib/types/journal';

export default function ViewJournalEntryPage() {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/');
      return;
    }

    if (user && entryId) {
      fetchEntry();
    }
  }, [user, entryId, userLoading, router]);

  async function fetchEntry() {
    if (!user || !entryId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/journal/${entryId}`, {
        headers: {
          'x-user-id': user.uid,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entry');
      }

      const data = await response.json();
      setEntry(data.entry);
    } catch (error) {
      console.error('Failed to fetch entry:', error);
      alert('Failed to load entry');
      router.push('/journal');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/journal/${entryId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user!.uid,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      router.push('/journal');
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (!user || !entry) {
    return null;
  }

  const moodConfig = getMoodConfig(entry.mood);
  const plainText = portableTextToPlainText(entry.content);
  const date = new Date(entry.createdAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.push('/journal')}
            className="group inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Journal</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/journal/${entryId}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Entry Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header with mood */}
          <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4 mb-4">
              <div
                className="p-4 rounded-2xl shadow-lg"
                style={{
                  backgroundColor: moodConfig.color + '20',
                }}
              >
                <span className="text-5xl">{moodConfig.emoji}</span>
              </div>
              <div className="flex-1">
                {entry.title && (
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {entry.title}
                  </h1>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar size={16} />
                    <span>
                      {date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: moodConfig.color + '20',
                      color: moodConfig.color,
                    }}
                  >
                    <span>Feeling {moodConfig.label}</span>
                  </div>
                  {entry.category && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: entry.category.color + '20', color: entry.category.color }}>
                      <Tag size={14} />
                      <span>{entry.category.title}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="prose dark:prose-invert max-w-none mb-8">
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {plainText}
              </p>
            </div>

            {/* Images */}
            {entry.images && entry.images.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                  <ImageIcon size={20} />
                  <h3>
                    {entry.images.length} {entry.images.length === 1 ? 'Image' : 'Images'}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {entry.images.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={image.url}
                          alt={image.alt || `Image ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                      {image.caption && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          {image.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Created on {date.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {entry.updatedAt && new Date(entry.updatedAt).getTime() !== date.getTime() && (
                <span> • Last edited on {new Date(entry.updatedAt).toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
