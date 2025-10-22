import { useCallback, useEffect, useMemo, useState } from "react"
import tips from "@/data/health-tips.json"
import positiveTips from "@/data/positive-tips.json"
import exercises from "@/data/exercises.json"
import { API_BASE_URL } from "@/services/config"
import type { Exercise, MoodData, SessionSummary } from "@/types"

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const emptyMood: MoodData = {
  mood: "Unknown",
  mood_percentage: 0,
  energy_level: 0,
  stress_level: 0,
  mood_stability: "Unknown",
  mood_calmness: "Unknown",
  cognitive_score: 0,
  emotional_score: 0,
  sleep_quality: null,
  sleep_duration_hours: null,
  social_connection_level: null,
  social_interaction_log: null,
  physical_activity_minutes: null,
  physical_activity_summary: null,
  anxiety_level: null,
  focus_level: null,
  positive_event: null,
  generated_at_utc: new Date().toISOString(),
}

export const useDashboardData = (uid?: string) => {
  const [moodData, setMoodData] = useState<MoodData | null>(null)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [suggestedExercises, setSuggestedExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wellbeingTip = useMemo(() => {
    if (!tips.length) return "Stay hydrated and take mindful breaks."
    const twelveHours = 12 * 60 * 60 * 1000
    const index = Math.floor(Date.now() / twelveHours) % tips.length
    return tips[index]?.tip ?? tips[0].tip
  }, [])

  const positiveAffirmation = useMemo(() => {
    if (!positiveTips.length) return "You are doing your best today."
    const index = Math.floor(Math.random() * positiveTips.length)
    return positiveTips[index]?.quote ?? positiveTips[0].quote
  }, [])

  const hydrateExercises = useCallback(
    (ids?: string[] | null) => {
      if (!ids?.length) {
        setSuggestedExercises([])
        return
      }
      const matches = (exercises as Exercise[]).filter((exercise) => ids.includes(exercise.id))
      setSuggestedExercises(matches)
    },
    []
  )

  const fetchDashboard = useCallback(async () => {
    if (!uid) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/user/${uid}`)
      if (!response.ok) {
        throw new Error(`Unable to load dashboard (${response.status})`)
      }

      const data = (await response.json()) as {
        latestSummary?: { summary_data?: Record<string, unknown>; suggested_exercises?: string[] }
      }

      if (data.latestSummary?.summary_data) {
        const summary = data.latestSummary.summary_data
        const normalizedMood: MoodData = {
          ...emptyMood,
          mood: typeof summary.mood === "string" ? summary.mood : emptyMood.mood,
          mood_percentage: parseNumber(summary.mood_percentage) ?? emptyMood.mood_percentage,
          energy_level: parseNumber(summary.energy_level) ?? emptyMood.energy_level,
          stress_level: parseNumber(summary.stress_level) ?? emptyMood.stress_level,
          mood_stability:
            typeof summary.mood_stability === "string"
              ? summary.mood_stability
              : emptyMood.mood_stability,
          mood_calmness:
            typeof summary.mood_calmness === "string"
              ? summary.mood_calmness
              : emptyMood.mood_calmness,
          cognitive_score: parseNumber(summary.cognitive_score) ?? emptyMood.cognitive_score,
          emotional_score: parseNumber(summary.emotional_score) ?? emptyMood.emotional_score,
          sleep_quality:
            typeof summary.sleep_quality === "string" ? summary.sleep_quality : emptyMood.sleep_quality,
          sleep_duration_hours: parseNumber(summary.sleep_duration_hours),
          social_connection_level:
            typeof summary.social_connection_level === "string"
              ? summary.social_connection_level
              : emptyMood.social_connection_level,
          social_interaction_log:
            typeof summary.social_interaction_log === "string"
              ? summary.social_interaction_log
              : emptyMood.social_interaction_log,
          physical_activity_minutes: parseNumber(summary.physical_activity_minutes),
          physical_activity_summary:
            typeof summary.physical_activity_summary === "string"
              ? summary.physical_activity_summary
              : emptyMood.physical_activity_summary,
          anxiety_level: parseNumber(summary.anxiety_level),
          focus_level:
            typeof summary.focus_level === "string" ? summary.focus_level : emptyMood.focus_level,
          positive_event:
            typeof summary.positive_event === "string" ? summary.positive_event : emptyMood.positive_event,
          generated_at_utc:
            typeof summary.generated_at_utc === "string"
              ? summary.generated_at_utc
              : emptyMood.generated_at_utc,
        }

        setMoodData(normalizedMood)
        setSessionSummary(data.latestSummary)
        hydrateExercises(data.latestSummary.suggested_exercises ?? null)
      } else {
        setMoodData(null)
        setSessionSummary(null)
        setSuggestedExercises([])
      }
    } catch (caught) {
      console.error("Failed to fetch dashboard data", caught)
      setError(caught instanceof Error ? caught.message : "Unable to load dashboard")
    } finally {
      setIsLoading(false)
    }
  }, [uid, hydrateExercises])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return {
    moodData,
    sessionSummary,
    suggestedExercises,
    wellbeingTip,
    positiveAffirmation,
    isLoading,
    error,
    refresh: fetchDashboard,
  }
}
