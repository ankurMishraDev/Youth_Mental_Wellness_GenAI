/**
 * Configuration for Youth Guide AI Mentor
 * Matches server.py configuration and settings
 */

// Audio Configuration (matches server.py constants)
export const AUDIO_CONFIG = {
  SEND_SAMPLE_RATE: parseInt(import.meta.env.VITE_SEND_SAMPLE_RATE) || 16000,
  RECEIVE_SAMPLE_RATE: parseInt(import.meta.env.VITE_RECEIVE_SAMPLE_RATE) || 24000,
  PROCESSOR_BUFFER_SIZE: 4096,
  AUDIO_CHANNELS: 1,
} as const;

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8765',
  RECONNECT_ATTEMPTS: 3,
  CONNECTION_TIMEOUT: 5000,
} as const;

// Server Configuration (for information/debugging)
export const SERVER_CONFIG = {
  MODEL: import.meta.env.VITE_SERVER_MODEL || 'gemini-live-2.5-flash-preview-native-audio',
  VOICE: import.meta.env.VITE_SERVER_VOICE || 'Puck',
  PROJECT_ID: 'gen-ai-hack2skill-470416', // from server.py
  LOCATION: 'us-central1', // from server.py
} as const;

// Backend API Configuration
export const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
} as const;

// Application Configuration
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'Youth Guide AI Mentor',
} as const;

// Message Types (matching server.py)
export const MESSAGE_TYPES = {
  // Client to Server
  AUDIO: 'audio',
  TEXT: 'text',
  USER_ID: 'user_id',
  END: 'end',
  
  // Server to Client
  READY: 'ready',
  SESSION_ID: 'session_id',
  TURN_COMPLETE: 'turn_complete',
  INTERRUPTED: 'interrupted',
  ERROR: 'error',
  SUMMARY_SAVED: 'summary_saved',
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// WebSocket Message Interfaces
export interface WebSocketMessage {
  type: MessageType;
  data?: string | object;
}

export interface AudioMessage extends WebSocketMessage {
  type: typeof MESSAGE_TYPES.AUDIO;
  data: string; // base64 encoded audio
}

export interface TextMessage extends WebSocketMessage {
  type: typeof MESSAGE_TYPES.TEXT;
  data: string;
}

export interface UserIdMessage extends WebSocketMessage {
  type: typeof MESSAGE_TYPES.USER_ID;
  data: string;
}

export interface SessionIdMessage extends WebSocketMessage {
  type: typeof MESSAGE_TYPES.SESSION_ID;
  data: string;
}
