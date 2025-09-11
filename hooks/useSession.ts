import { useState, useEffect, useRef } from "react"
import { AudioClientType, User, Message, DashboardPage } from "../lib/types"

export const useSession = (
  currentUser: User | null,
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
) => {
  const [isRecording, setIsRecording] = useState(false)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [sessionActive, setSessionActive] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [dashboardPage, setDashboardPage] = useState<DashboardPage>("home")

  const audioClientRef = useRef<AudioClientType | null>(null)
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)

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
    try {
      const { default: AudioClient } = await import("../lib/audio-client.js")
      const audioClient = new AudioClient("ws://localhost:8765")

      await audioClient.connect()

      // Send user ID to WebSocket server
      if (currentUser?.uid && audioClient.ws) {
        audioClient.ws.send(
          JSON.stringify({
            type: "user_id",
            data: currentUser.uid,
          })
        )
      }

      let currentResponseText = ""
      let currentResponseElement: Message | null = null

      audioClient.onReady = () => {
        console.log("Audio client ready")
        setSessionActive(true)
        setMessages((prev) => [
          ...prev,
          {
            text: "Hello! I'm YouthGuide, your AI mentor. I'm here to listen and support you. What's on your mind today?",
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

      audioClientRef.current = audioClient
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
    }
    setSessionActive(false)
    setSessionSeconds(0)
    setMessages((prev) => [
      ...prev,
      {
        text: "Our session has ended. Remember to take care of yourself! 💙",
        sender: "assistant",
      },
    ])
    // Note: setCurrentView("dashboard") will be handled in main component
  }

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
  }
}