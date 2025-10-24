/**
 * Journal List Page
 * Display all user's journal entries with beautiful UI
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';
import { JournalEntryCard } from '@/components/journal/JournalEntryCard';
import { PlusCircle, Loader2, BookOpen, TrendingUp, Calendar } from 'lucide-react';
import type { JournalEntry } from '@/lib/types/journal';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, isLoading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !userId) {
      // If no user, redirect to sign-in
      router.push('/');
      return;
    }

    if (userId) {
      fetchEntries();
    }
  }, [userId, userLoading, router]);

  async function fetchEntries() {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/journal', {
        headers: {
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const response = await fetch(`/api/journal/${entryId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId!,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      // Remove from local state
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  }

  // Show loading state while checking user
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!userId) {
    return null;
  }

  // Calculate stats
  const totalEntries = entries.length;
  const thisWeekEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entryDate >= weekAgo;
  }).length;

  const moodCounts = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header with gradient */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <BookOpen size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Journal
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'} • Your personal space for reflection
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/journal/new')}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" />
              <span className="font-medium">New Entry</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEntries}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Calendar className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{thisWeekEntries}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <TrendingUp className="text-pink-600 dark:text-pink-400" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Common Mood</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {mostCommonMood.replace('-', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={48} className="animate-spin text-purple-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="mb-6">
              <BookOpen size={80} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              No journal entries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Start your wellness journey by documenting your thoughts, feelings, and experiences
            </p>
            <button
              onClick={() => router.push('/journal/new')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <PlusCircle size={20} />
              Create your first entry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        )}

        {/* Floating Action Button for Mobile */}
        <button
          onClick={() => router.push('/journal/new')}
          className="fixed bottom-6 right-6 sm:hidden p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-xl transition-all transform hover:scale-110"
          aria-label="Create new entry"
        >
          <PlusCircle size={24} />
        </button>
      </div>
    </div>
  );
}
