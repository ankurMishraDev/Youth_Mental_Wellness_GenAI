/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string
  readonly VITE_SEND_SAMPLE_RATE: string
  readonly VITE_RECEIVE_SAMPLE_RATE: string
  readonly VITE_SERVER_MODEL: string
  readonly VITE_SERVER_VOICE: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_APP_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
