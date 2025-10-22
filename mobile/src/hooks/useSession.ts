import { useEffect, useRef, useState } from "react"
import type { AuthUser } from "@/services/auth"
import AudioClient from "@/lib/audio-client"
import type { Sender } from "@/types"

export type Message = {
  text: string
  sender: Sender
}

export const useSession = (
  currentUser: AuthUser | null,
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
) => {
  const [isRecording, setIsRecording] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [sessionActive, setSessionActive] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [inputMode, setInputMode] = useState<"audio" | "text">("text")

  const audioClientRef = useRef<AudioClient | null>(null)
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (sessionActive) {
      sessionTimerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1)
      }, 1000)
    } else if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current)
      sessionTimerRef.current = null
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current)
        sessionTimerRef.current = null
      }
    }
  }, [sessionActive])

  const initializeAudioClient = async () => {
    if (!currentUser?.uid) {
      throw new Error("User must be authenticated to start a session")
    }

    const audioClient = new AudioClient()
    audioClient.setUserId(currentUser.uid)

    audioClient.onReady = () => {
      setSessionActive(true)
      setSessionSeconds(0)
      setMessages([
        {
          text: "Hello! I'm CureZ, your AI mentor. What's on your mind today?",
          sender: "assistant",
        },
      ])
    }

    audioClient.onTextReceived = (text: string) => {
      if (!text) return
      setMessages((prev) => [...prev, { text, sender: "assistant" }])
      setIsAudioPlaying(false)
    }

    audioClient.onTurnComplete = () => {
      setIsAudioPlaying(false)
    }

    audioClient.onError = (error: unknown) => {
      console.error("Audio client error:", error)
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, something went wrong. Let's try again in a moment.",
          sender: "assistant",
        },
      ])
    }

    await audioClient.connect()
    audioClientRef.current = audioClient
  }

  const startRecording = () => {
    if (!sessionActive) {
      setSessionActive(true)
    }
    setIsRecording(true)
    setIsAudioPlaying(true)
  }

  const stopRecording = () => {
    setIsRecording(false)
    setIsAudioPlaying(false)
  }

  const endSession = () => {
    if (audioClientRef.current) {
      audioClientRef.current.close()
      audioClientRef.current = null
    }
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
    setSessionActive(false)
    setSessionSeconds(0)
    setIsRecording(false)
    setIsAudioPlaying(false)
    setMessages([])
  }

  const sendTextMessage = (message: string) => {
    if (!message.trim()) return
    const text = message.trim()
    setMessages((prev) => [...prev, { text, sender: "user" }])
    audioClientRef.current?.sendTextMessage(text)
  }

  return {
    isRecording,
    sessionSeconds,
    sessionActive,
    isAudioPlaying,
    inputMode,
    setInputMode,
    initializeAudioClient,
    startRecording,
    stopRecording,
    endSession,
    sendTextMessage,
    audioClientRef,
  }
}
