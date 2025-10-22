export type ViewType = "landing" | "auth" | "dashboard" | "session";
export type AuthMode = "login" | "signup";
export type DashboardTab = "home" | "sessions" | "resources" | "profile";
export type InputMode = "audio" | "text";

export interface User {
  uid: string;
  email: string;
  name?: string;
  age?: number;
  gender?: string;
}

export interface MoodData {
  mood: string;
  mood_percentage: number;
  energy_level: number;
  stress_level: number;
  mood_stability: string;
  mood_calmness: string;
  cognitive_score: number;
  emotional_score: number;
  sleep_quality: string | null;
  sleep_duration_hours: number | null;
  social_connection_level: string | null;
  social_interaction_log: string | null;
  physical_activity_minutes: number | null;
  physical_activity_summary: string | null;
  anxiety_level: number | null;
  focus_level: string | null;
  positive_event: string | null;
  generated_at_utc: string;
}

export interface Exercise {
  id: string;
  exercise_name: string;
  procedure: string;
  bgSound: string;
  video_link: string;
  expected_time_to_complete: string;
  image: string;
}

export interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  createdAt: number;
}

export interface SessionSummary {
  id: string;
  summary_data: {
    highlights: string[];
    mood?: MoodData;
    suggested_exercises?: Exercise[];
  };
  createdAt: string;
}

export interface AuthFormState {
  email: string;
  password: string;
}

export interface SignupFormState extends AuthFormState {
  name: string;
  age: string;
  gender: string;
}
