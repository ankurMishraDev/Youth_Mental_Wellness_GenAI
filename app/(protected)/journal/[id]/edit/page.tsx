/**
 * Edit Journal Entry Page
 * Update an existing journal entry
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';
import { JournalEntryForm } from '@/components/journal/JournalEntryForm';
import { ArrowLeft, Edit3, Loader2 } from 'lucide-react';
import type { JournalEntry, CreateJournalEntryInput } from '@/lib/types/journal';

export default function EditJournalEntryPage() {
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

  async function handleSubmit(data: CreateJournalEntryInput) {
    if (!user || !entryId) return;

    try {
      const response = await fetch(`/api/journal/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update entry');
      }

      router.push(`/journal/${entryId}`);
    } catch (error) {
      console.error('Failed to update entry:', error);
      throw error;
    }
  }

  function handleCancel() {
    if (confirm('Discard changes?')) {
      router.push(`/journal/${entryId}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/journal/${entryId}`)}
            className="group inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Entry</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Edit3 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edit Journal Entry
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Update your thoughts and feelings
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <JournalEntryForm
            userId={user!.uid}
            initialData={{
              title: entry.title,
              content: entry.content,
              mood: entry.mood,
              images: entry.images,
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="Update Entry"
            isEditing={true}
          />
        </div>
      </div>
    </div>
  );
}
