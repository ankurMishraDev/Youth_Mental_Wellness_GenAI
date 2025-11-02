/**
 * Create New Journal Entry Page
 * Beautiful form for creating journal entries
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';
import { JournalEntryForm } from '@/components/journal/JournalEntryForm';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import type { CreateJournalEntryInput } from '@/lib/types/journal';

export default function NewJournalEntryPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth');
    }
  }, [userLoading, user, router]);

  async function handleSubmit(data: CreateJournalEntryInput) {
    if (!user?.uid) {
      alert('You must be signed in to create an entry');
      return;
    }

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
        body: JSON.stringify({
          ...data,
          autoCategorize: true, // Enable AI categorization
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create entry');
      }

      // Success - redirect to journal list
      router.push('/journal');
    } catch (error) {
      console.error('Failed to create entry:', error);
      throw error; // Let the form handle the error display
    }
  }

  function handleCancel() {
    if (confirm('Discard this entry?')) {
      router.push('/journal');
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-orange-900/20 dark:to-rose-900/20">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-orange-600 dark:text-orange-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-orange-900/20 dark:to-rose-900/20 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/journal')}
            className="group inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Journal</span>
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl shadow-lg">
                <Sparkles size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                  New Journal Entry
                </h1>
                <p className="text-orange-800/80 dark:text-orange-200/80 mt-1">
                  Express your thoughts and feelings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-orange-200 dark:border-orange-700 p-6 overflow-y-auto">
            <JournalEntryForm
              userId={user!.uid}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel="Save Entry"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
