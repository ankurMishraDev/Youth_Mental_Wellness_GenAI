import { useCallback, useMemo, useState } from "react"
import { sendSessionMessage } from "@/services/session"
import type { ChatMessage } from "@/services/session"

const createMessage = (text: string, sender: "user" | "assistant"): ChatMessage => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  text,
  sender,
  createdAt: new Date().toISOString(),
})

export const useChatSession = (userId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage(
      "Hello! I'm CureZ, your AI mentor. Share how you're feeling today, and we'll work through it together.",
      "assistant"
    ),
  ])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return
      }
      const outgoing = createMessage(text.trim(), "user")
      setMessages((prev) => [...prev, outgoing])
      setIsSending(true)
      setError(null)

      try {
        const reply = await sendSessionMessage(text.trim(), { userId })
        setMessages((prev) => [...prev, createMessage(reply.reply, "assistant")])
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Something went wrong"
        setError(message)
        setMessages((prev) => [
          ...prev,
          createMessage(
            "I couldn't reach the live service right now, but I'm still here for you. Let's try again soon.",
            "assistant"
          ),
        ])
      } finally {
        setIsSending(false)
      }
    },
    [userId]
  )

  const contextValue = useMemo(
    () => ({
      messages,
      isSending,
      error,
    }),
    [messages, isSending, error]
  )

  return {
    ...contextValue,
    sendTextMessage,
    clearError: () => setError(null),
  }
}
