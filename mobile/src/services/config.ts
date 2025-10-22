const normalizeBaseUrl = (value: string | undefined) => {
  if (!value) {
    return undefined
  }
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export const API_BASE_URL =
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL) || "http://localhost:3000"

export const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY

export const WS_PATH = process.env.EXPO_PUBLIC_WS_PATH || "ws://localhost:8080/ws/"
