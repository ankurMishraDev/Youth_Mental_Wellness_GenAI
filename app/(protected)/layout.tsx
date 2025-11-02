/**
 * Protected Routes Layout
 * Shared layout for all authenticated routes (dashboard, journal, session)
 * Handles authentication and provides Sidebar navigation
 */

'use client';

import { Sidebar } from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';
import { useEffect } from 'react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // Only redirect if we're done loading and there's no user
  // Middleware already protects routes, this is just a fallback
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-orange-900/20 dark:to-rose-900/20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-orange-600 dark:text-orange-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if no user (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-orange-900/20 dark:to-rose-900/20 overflow-hidden">
      <Sidebar onNavigateToLanding={() => router.push('/')} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
