import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";
import type { Exercise, MoodData, SessionSummary } from "../types";
import healthTips from "../data/health-tips.json";
import positiveTips from "../data/positive-tips.json";
import exercisesCatalog from "../data/exercises.json";

interface UserApiResponse {
  uid: string;
  email: string;
  name?: string;
  age?: number;
  gender?: string;
  latestSummary?: {
    id: string;
    createdAt?: string;
    summary_data?: {
      highlights?: string[];
      mood?: MoodData;
      suggested_exercises?: Array<Exercise | string>;
    };
  };
}

const pickTip = (index: number) => {
  const normalizedIndex = ((index % healthTips.length) + healthTips.length) % healthTips.length;
  return healthTips[normalizedIndex]?.tip ?? healthTips[0]?.tip ?? "Stay hydrated and keep shining.";
};

const pickPositiveQuote = (index: number) => {
  const normalizedIndex = ((index % positiveTips.length) + positiveTips.length) % positiveTips.length;
  return positiveTips[normalizedIndex]?.quote ?? positiveTips[0]?.quote ?? "You are capable of amazing things.";
};

const mapExercise = (item: Exercise | string): Exercise | null => {
  if (typeof item === "string") {
    return (
      exercisesCatalog.find((exercise) => exercise.id === item) ?? null
    );
  }

  const fallback = exercisesCatalog.find((exercise) => exercise.id === item.id);

  return {
    id: item.id || fallback?.id || `exercise-${Math.random().toString(36).slice(2)}`,
    exercise_name: item.exercise_name || fallback?.exercise_name || "Mindful Pause",
    procedure: item.procedure || fallback?.procedure || "Follow the guided breathing pattern for 5 minutes.",
    bgSound: item.bgSound || fallback?.bgSound || "",
    video_link: item.video_link || fallback?.video_link || "",
    expected_time_to_complete:
      item.expected_time_to_complete || fallback?.expected_time_to_complete || "5 mins",
    image: item.image || fallback?.image || fallback?.id || "",
  };
};

export const useDashboardData = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [latestSummary, setLatestSummary] = useState<SessionSummary | null>(null);
  const [suggestedExercises, setSuggestedExercises] = useState<Exercise[]>([]);

  const tipIndex = useMemo(() => Math.floor(Date.now() / (12 * 60 * 60 * 1000)), []);
  const tip = useMemo(() => pickTip(tipIndex), [tipIndex]);
  const positiveQuote = useMemo(() => pickPositiveQuote(tipIndex + 1), [tipIndex]);

  const refresh = useCallback(async () => {
    if (!currentUser?.uid) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch<UserApiResponse>(`/api/user/${currentUser.uid}`);
      const summary = response.latestSummary;
      if (summary) {
        const mappedExercises = summary.summary_data?.suggested_exercises
          ?.map(mapExercise)
          .filter((exercise): exercise is Exercise => Boolean(exercise));

        const normalizedSummary: SessionSummary = {
          id: summary.id,
          createdAt: summary.createdAt || new Date().toISOString(),
          summary_data: {
            highlights: summary.summary_data?.highlights ?? [],
            mood: summary.summary_data?.mood,
            suggested_exercises: mappedExercises,
          },
        };
        setLatestSummary(normalizedSummary);
        setMoodData(summary.summary_data?.mood ?? null);
        const exercisesFromSummary = mappedExercises ?? [];
        setSuggestedExercises(exercisesFromSummary);
      } else {
        setLatestSummary(null);
        setMoodData(null);
        setSuggestedExercises([]);
      }
    } catch (err) {
      console.warn("Failed to load dashboard data", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isLoading,
    error,
    moodData,
    latestSummary,
    suggestedExercises,
    tip,
    positiveQuote,
    allExercises: exercisesCatalog,
    refresh,
  };
};
