/**
 * Journal Chat Page
 * Dedicated page for AI-powered chat about journal entries
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';
import { JournalChat } from '@/components/journal/JournalChat';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function JournalChatPage() {
  const { userId, isLoading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !userId) {
      router.push('/');
    }
  }, [userLoading, userId, router]);

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

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/journal')}
            className="group inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Journal</span>
          </button>
          
          <div className="mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Chat with CureZ
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Have a conversation about your journal entries, feelings, and experiences. 
              CureZ has read all your entries and is here to provide empathetic support.
            </p>
          </div>
        </div>

        {/* Chat Component */}
        <div className="max-w-4xl mx-auto">
          <JournalChat userId={userId} />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Context-Aware</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              CureZ knows all your journal entries and can reference them in conversation
            </p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Empathetic Support</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get gentle, non-judgmental support as you explore your feelings
            </p>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Image Analysis</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              CureZ can discuss images from your journal entries
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
