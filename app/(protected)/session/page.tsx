'use client';

import { Session } from '@/components/Session';
import { useMessages } from '@/hooks/useMessages';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Exercise } from '@/lib/types';

export default function SessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const auth = useAuth();
  const [isReady, setIsReady] = useState(false);
  const { messages, setMessages, messagesEndRef } = useMessages();
  const session = useSession(auth.currentUser, setMessages);

  useEffect(() => {
    const exerciseQuery = searchParams.get('exercise');
    if (exerciseQuery) {
      try {
        const exerciseData = JSON.parse(decodeURIComponent(exerciseQuery));
        setExercise(exerciseData);
      } catch (error) {
        console.error("Failed to parse exercise data from URL", error);
      }
    }
  }, [searchParams]);

  // Protect session route and wait for validation
  useEffect(() => {
    // Still validating - don't do anything yet
    if (auth.isValidatingSession) {
      return;
    }

    // Validation complete but no user - redirect to auth
    if (!auth.currentUser) {
      router.replace('/auth');
      return;
    }

    // User validated - mark as ready
    setIsReady(true);
  }, [auth.isValidatingSession, auth.currentUser, router]);

  // Initialize audio client only after user is validated
  useEffect(() => {
    if (isReady && auth.currentUser && !session.audioClientRef.current) {
      console.log("User validated, initializing audio client");
      session.initializeAudioClient();
    }
  }, [isReady, auth.currentUser, session]);

  const handleEndSession = () => {
    session.endSession();
    router.push('/dashboard/sessions');
  };

  // Show loading while validating or preparing
  if (auth.isValidatingSession || !isReady || !auth.currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="text-gray-600">
          {auth.isValidatingSession ? "Validating session..." : "Preparing your session..."}
        </p>
      </div>
    );
  }

  return (
    <Session
      exercise={exercise}
      messages={messages}
      messagesEndRef={messagesEndRef}
      isRecording={session.isRecording}
      sessionSeconds={session.sessionSeconds}
      sessionActive={session.sessionActive}
      isAudioPlaying={session.isAudioPlaying}
      startRecording={session.startRecording}
      stopRecording={session.stopRecording}
      endSession={handleEndSession}
      setCurrentView={(view) => {
        if (view === 'dashboard') {
          router.push('/dashboard');
        }
      }}
      sendTextMessage={session.sendTextMessage}
      setInputMode={session.setInputMode}
    />
  );
}
