'use client';

import { HomeSection } from '@/components/sections/HomeSection';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MoodData } from '@/lib/types';
import tips from '@/lib/health-tips.json';
import positiveTips from '@/lib/positive-tips.json';

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [isLoadingMood, setIsLoadingMood] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [positiveTip, setPositiveTip] = useState('');

  useEffect(() => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    const randomPositiveTip = positiveTips[Math.floor(Math.random() * positiveTips.length)];
    setCurrentTip(randomTip.tip);
    setPositiveTip(randomPositiveTip.quote);
  }, []);

  useEffect(() => {
    const fetchMoodData = async () => {
      if (!auth.currentUser?.uid) return;

      setIsLoadingMood(true);
      try {
        const response = await fetch(`/api/user/${auth.currentUser.uid}`);
        if (response.ok) {
          const userData = await response.json();
          const latestSummary = userData.latestSummary?.summary_data;

          if (latestSummary && latestSummary.mood) {
            const parseToNumberOrNull = (value: any): number | null => {
              if (typeof value === "number") return value;
              if (typeof value === "string") {
                const parsed = parseFloat(value);
                return isNaN(parsed) ? null : parsed;
              }
              return null;
            };

            const moodDataObj: MoodData = {
              mood: latestSummary.mood,
              mood_percentage: latestSummary.mood_percentage || 0,
              energy_level: latestSummary.energy_level || 0,
              stress_level: latestSummary.stress_level || 0,
              mood_stability: latestSummary.mood_stability || "Unknown",
              mood_calmness: latestSummary.mood_calmness || "Unknown",
              cognitive_score: latestSummary.cognitive_score || 0,
              emotional_score: latestSummary.emotional_score || 0,
              sleep_quality: latestSummary.sleep_quality ?? null,
              sleep_duration_hours: parseToNumberOrNull(latestSummary.sleep_duration_hours),
              social_connection_level: latestSummary.social_connection_level ?? null,
              social_interaction_log: latestSummary.social_interaction_log ?? null,
              physical_activity_minutes: parseToNumberOrNull(latestSummary.physical_activity_minutes),
              physical_activity_summary: latestSummary.physical_activity_summary ?? null,
              anxiety_level: parseToNumberOrNull(latestSummary.anxiety_level),
              focus_level: latestSummary.focus_level ?? null,
              positive_event: latestSummary.positive_event ?? null,
              generated_at_utc: latestSummary.generated_at_utc || new Date().toISOString(),
            };
            
            setMoodData(moodDataObj);
          }
        }
      } catch (error) {
        console.error('Error fetching mood data:', error);
      } finally {
        setIsLoadingMood(false);
      }
    };

    fetchMoodData();
  }, [auth.currentUser?.uid]);

  const handleStartSession = () => {
    router.push('/session');
  };

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader 
        title={`Welcome back, ${auth.currentUser?.name || auth.currentUser?.email?.split('@')[0] || 'User'}`}
        description="Here's your wellness overview."
        currentUser={auth.currentUser} 
      />
      <HomeSection
        setCurrentView={(view) => {
          if (view === 'session') {
            router.push('/session');
          }
        }}
        isLoadingMood={isLoadingMood}
        moodData={moodData}
        currentTip={currentTip}
        positiveTip={positiveTip}
      />
    </div>
  );
}
