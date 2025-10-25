'use client';

import { Sidebar } from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const auth = useAuth();

  // Protect dashboard route - redirect to auth if not logged in (after validation completes)
  useEffect(() => {
    if (!auth.isValidatingSession && !auth.currentUser) {
      router.replace('/auth');
    }
  }, [auth.currentUser, auth.isValidatingSession, router]);

  const handleLogout = () => {
    auth.handleLogout();
    router.push('/');
  };

  const handleNavigateToLanding = () => {
    router.push('/');
  };

  // Show loading while validating session
  if (auth.isValidatingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting to auth
  if (!auth.currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <Sidebar
        handleLogout={handleLogout}
        onNavigateToLanding={handleNavigateToLanding}
      />
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
