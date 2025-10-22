import { useState, useEffect, useRef } from "react"
import { AuthUser } from "@/services/auth"
import AudioClient from "../lib/audio-client"

export type Message = {
  text: string
  sender: "user" | "assistant"
}

export const useSession = (
  currentUser: AuthUser | null,
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
) => {
  const audioClientRef = useRef<AudioClient | null>(null)

  const initializeAudioClient = async () => {
    if (!currentUser?.uid) {
      return
    }

    const audioClient = new AudioClient()
    audioClient.setUserId(currentUser.uid)

    audioClient.onReady = () => {
      setMessages([
        {
          text: "Hello! I'm CureZ, your AI mentor. What's on your mind today?",
          sender: "assistant",
        },
      ])
    }

    audioClient.onTextReceived = (text: string) => {
      setMessages((prev) => [...prev, { text, sender: "assistant" }])
    }

    audioClient.onError = (error: any) => {
      console.error("Audio client error:", error)
    }

    await audioClient.connect()
    audioClientRef.current = audioClient
  }

  const endSession = () => {
    if (audioClientRef.current) {
      audioClientRef.current.close()
      audioClientRef.current = null
    }
  }

  const sendTextMessage = (message: string) => {
    if (audioClientRef.current) {
      audioClientRef.current.sendTextMessage(message)
      setMessages((prev) => [...prev, { text: message, sender: "user" }])
    }
  }

  return {
    initializeAudioClient,
    endSession,
    sendTextMessage,
  }
}
