'use client';

import { ResourcesSection } from '@/components/sections/ResourcesSection';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Exercise } from '@/lib/types';
import allExercises from '@/lib/exercises.json';

export default function ResourcesPage() {
  const router = useRouter();
  const auth = useAuth();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [suggestedExercises, setSuggestedExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);

  useEffect(() => {
    const fetchSuggestedExercises = async () => {
      if (!auth.currentUser?.uid) return;

      setIsLoadingExercises(true);
      try {
        const response = await fetch(`/api/user/${auth.currentUser.uid}`);
        if (response.ok) {
          const userData = await response.json();
          const latestSummary = userData.latestSummary?.summary_data;

          // Filter exercises based on suggested exercise IDs from user data
          if (latestSummary?.suggested_exercises && Array.isArray(latestSummary.suggested_exercises)) {
            const filteredExercises = (allExercises as Exercise[]).filter(ex =>
              latestSummary.suggested_exercises.includes(ex.id)
            );
            
            // Fix image paths from relative to absolute
            const exercisesWithFixedPaths = filteredExercises.map(ex => ({
              ...ex,
              image: ex.image.replace('./images/', '/images/')
            }));
            
            setSuggestedExercises(exercisesWithFixedPaths);
          } else {
            // Fallback to random exercises if no suggestions
            const randomExercises = (allExercises as Exercise[])
              .sort(() => Math.random() - 0.5)
              .slice(0, 3)
              .map(ex => ({
                ...ex,
                image: ex.image.replace('./images/', '/images/')
              }));
            setSuggestedExercises(randomExercises);
          }
        }
      } catch (error) {
        console.error('Error fetching suggested exercises:', error);
        // Fallback to random exercises on error
        const randomExercises = (allExercises as Exercise[])
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(ex => ({
            ...ex,
            image: ex.image.replace('./images/', '/images/')
          }));
        setSuggestedExercises(randomExercises);
      } finally {
        setIsLoadingExercises(false);
      }
    };

    fetchSuggestedExercises();
  }, [auth.currentUser?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 p-2 md:p-4">
      <DashboardHeader 
        title="Wellness Resources"
        description="Explore exercises and tips to support your mental well-being."
        currentUser={auth.currentUser} 
      />
      <ResourcesSection
        setCurrentView={(view) => {
          if (view === 'session') {
            router.push('/session');
          }
        }}
        isLoadingExercises={isLoadingExercises}
        suggestedExercises={suggestedExercises}
        setSelectedExercise={setSelectedExercise}
      />
    </div>
  );
}
