import { useState, useEffect, useRef } from "react"
import { Message } from "../lib/types"

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return {
    messages,
    setMessages,
    messagesEndRef,
  }
}