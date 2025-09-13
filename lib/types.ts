export interface AudioClientType {
  connect: () => Promise<void>
  startRecording: () => Promise<boolean>
  stopRecording: () => void
  close: () => void
  ws: WebSocket | null
  onReady: () => void
  onAudioReceived: (data: string) => void
  onTextReceived: (text: string) => void
  onTurnComplete: () => void
  onError: (error: any) => void
  onInterrupted: () => void
  interrupt: () => void
}

export interface User {
  uid: string
  email: string
  name?: string
  age?: number
  gender?: string
}

export interface Message {
  text: string
  sender: "user" | "assistant"
}

export interface MoodData {
  mood: string
  mood_percentage: number
  energy_level: number
  stress_level: number
  mood_stability: string
  mood_calmness: string
  generated_at_utc: string
}

export type ViewType = "auth" | "dashboard" | "session"
export type AuthMode = "login" | "signup"
export type DashboardPage = "home" | "sessions" | "resources" | "community" | "profile"