export type ViewType = "landing" | "auth" | "dashboard" | "session"

export type AuthMode = "login" | "signup"

export type DashboardPage = "home" | "sessions" | "resources" | "profile"

export type Sender = "user" | "assistant"

export type MoodData = {
  mood: string
  mood_percentage: number
  energy_level: number
  stress_level: number
  mood_stability: string
  mood_calmness: string
  cognitive_score: number
  emotional_score: number
  sleep_quality: string | null
  sleep_duration_hours: number | null
  social_connection_level: string | null
  social_interaction_log: string | null
  physical_activity_minutes: number | null
  physical_activity_summary: string | null
  anxiety_level: number | null
  focus_level: string | null
  positive_event: string | null
  generated_at_utc: string
}

export type SessionSummary = {
  created_at?: string
  summary_data?: Record<string, any>
  id?: string
}

export type Exercise = {
  id: string
  exercise_name: string
  procedure: string
  bgSound: string
  video_link: string
  expected_time_to_complete: string
  image: string
}
