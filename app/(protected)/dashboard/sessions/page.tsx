'use client';

import { SessionsSection } from '@/components/sections/SessionsSection';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SessionsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  useEffect(() => {
    const fetchSessionSummary = async () => {
      if (!auth.currentUser?.uid) return;

      setIsLoadingSession(true);
      try {
        const response = await fetch(`/api/user/${auth.currentUser.uid}`);
        if (response.ok) {
          const userData = await response.json();
          
          // Extract session summary from user data
          if (userData.latestSummary) {
            setSessionSummary(userData.latestSummary);
          }
        }
      } catch (error) {
        console.error('Error fetching session summary:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    fetchSessionSummary();
  }, [auth.currentUser?.uid]);

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 p-2 md:p-4">
      <DashboardHeader 
        title="AI Guide Session"
        description="Connect with your AI mentor for personalized support and guidance."
        currentUser={auth.currentUser} 
      />
      <SessionsSection
        onStartSession={() => router.push('/session')}
        isLoadingSession={isLoadingSession}
        sessionSummary={sessionSummary}
      />
    </div>
  );
}
