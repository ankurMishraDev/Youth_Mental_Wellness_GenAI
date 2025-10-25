import { useState, useEffect, useRef } from "react"
import { AudioClientType, User, Message, DashboardPage, InputMode } from "../lib/types"
import AudioClient from "../lib/audio-client.js"

export const useSession = (
  currentUser: User | null,
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
) => {
  const [isRecording, setIsRecording] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [sessionActive, setSessionActive] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [dashboardPage, setDashboardPage] = useState<DashboardPage>("home")
  const [inputMode, setInputMode] = useState<InputMode>("audio")

  const audioClientRef = useRef<AudioClientType | null>(null)
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializingRef = useRef(false)

  // Session timer
  useEffect(() => {
    if (sessionActive) {
      sessionTimerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current)
      }
    }

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current)
      }
    }
  }, [sessionActive])

  const initializeAudioClient = async () => {
    if (!currentUser?.uid) {
      console.warn("Cannot initialize audio client: User not logged in")
      return
    }

    if (isInitializingRef.current || audioClientRef.current) {
      console.log("Audio client already initialized or initializing")
      return
    }

    try {
      const { default: AudioClient } = await import("../lib/audio-client.js")
      const audioClient = new AudioClient()

      // Set the user ID before connecting
      audioClient.setUserId(currentUser.uid)

      await audioClient.connect()

      let currentResponseText = ""
      let currentResponseElement: Message | null = null

      audioClient.onReady = () => {
        console.log("Audio client ready")
        setSessionActive(true)
        setMessages([
          {
            text: "Hello! I'm CureZ, your AI mentor. I'm here to listen and support you. What's on your mind today?",
            sender: "assistant",
          },
        ])
      }

      audioClient.onAudioReceived = () => {
        setIsAudioPlaying(true)
      }

      ;(audioClient as any).onTextReceived = (text: string) => {
        if (text && text.trim()) {
          if (!currentResponseElement) {
            currentResponseText = text
            currentResponseElement = { text, sender: "assistant" }
            setMessages((prev) => [...prev, currentResponseElement!])
          } else {
            currentResponseText += " " + text.trim()
            currentResponseElement.text = currentResponseText
            setMessages((prev) => {
              const newMessages = [...prev]
              newMessages[newMessages.length - 1] = { ...currentResponseElement! }
              return newMessages
            })
          }
        }
      }

      audioClient.onTurnComplete = () => {
        setIsAudioPlaying(false)
        currentResponseText = ""
        currentResponseElement = null
      }

      ;(audioClient as any).onError = (error: any) => {
        console.error("Audio client error:", error)
        setMessages((prev) => [
          ...prev,
          {
            text: "Sorry, I encountered an error. Please try again.",
            sender: "assistant",
          },
        ])
        currentResponseText = ""
        currentResponseElement = null
      }

      audioClient.onInterrupted = () => {
        console.log("Interruption detected")
        setIsAudioPlaying(false)
        audioClient.interrupt()
        currentResponseText = ""
        currentResponseElement = null
      }

      audioClientRef.current = audioClient as AudioClientType
    } catch (error) {
      console.error("Failed to initialize audio client:", error)
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I'm having trouble connecting. Please try again later.",
          sender: "assistant",
        },
      ])
    }
  }

  const startRecording = async () => {
    if (audioClientRef.current) {
      const success = await audioClientRef.current.startRecording()
      if (success) {
        setIsRecording(true)
        setMessages((prev) => [...prev, { text: "Listening...", sender: "user" }])
      }
    }
  }

  const stopRecording = () => {
    if (audioClientRef.current) {
      audioClientRef.current.stopRecording()
      setIsRecording(false)
      // Remove the "Listening..." message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.text !== "Listening...")
        return filtered
      })
    }
  }

  const endSession = () => {
    if (isRecording) {
      stopRecording()
    }
    if (audioClientRef.current) {
      audioClientRef.current.close()
      audioClientRef.current = null // Reset the client
    }
    setSessionActive(false)
    setSessionSeconds(0)
    setMessages([]) // Clear conversation data
    // Note: setCurrentView("dashboard") will be handled in main component
  }

  const sendTextMessage = (message: string) => {
    if (audioClientRef.current) {
      audioClientRef.current.sendTextMessage(message)
      setMessages((prev) => [...prev, { text: message, sender: "user" }])
    }
  }

  useEffect(() => {
    if (audioClientRef.current) {
      audioClientRef.current.inputMode = inputMode
    }
  }, [inputMode])

  return {
    isRecording,
    sessionSeconds,
    sessionActive,
    isAudioPlaying,
    dashboardPage,
    setDashboardPage,
    audioClientRef,
    initializeAudioClient,
    startRecording,
    stopRecording,
    endSession,
    sendTextMessage,
    inputMode,
    setInputMode,
  }
}
