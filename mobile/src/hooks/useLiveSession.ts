import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { InputMode, Message, User } from "../types";

const createMessage = (text: string, sender: Message["sender"]): Message => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  text,
  sender,
  createdAt: Date.now(),
});

const mentorPrompts = [
  "I'm here with you. What would you like to share today?",
  "Thanks for opening up. Can you tell me more about that?",
  "Let's take a calming breath together. What support feels helpful right now?",
];

export const useLiveSession = (user: User | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("audio");
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionActive]);

  const startSession = useCallback(() => {
    if (!user?.uid) {
      throw new Error("User must be authenticated to start a session");
    }

    setSessionActive(true);
    setSessionSeconds(0);
    setMessages([
      createMessage(
        "Hey there! I'm CureZ, your AI mentor. I'm ready to listen whenever you want to begin.",
        "assistant"
      ),
    ]);
  }, [user?.uid]);

  const endSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSessionActive(false);
    setSessionSeconds(0);
    setIsRecording(false);
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim()) {
      return;
    }

    const userMessage = createMessage(text.trim(), "user");
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessingResponse(true);

    setTimeout(() => {
      const response = mentorPrompts[(Math.floor(Math.random() * mentorPrompts.length)) % mentorPrompts.length];
      setMessages((prev) => [...prev, createMessage(response, "assistant")]);
      setIsProcessingResponse(false);
    }, 1200);
  }, []);

  const startRecording = useCallback(() => {
    if (inputMode !== "audio") {
      setInputMode("audio");
    }
    setIsRecording(true);
    setMessages((prev) => [...prev, createMessage("Listening...", "assistant")]);
  }, [inputMode]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setMessages((prev) => prev.filter((message) => message.text !== "Listening..."));
  }, []);

  const toggleInputMode = useCallback(() => {
    setInputMode((mode) => (mode === "audio" ? "text" : "audio"));
    setIsRecording(false);
  }, []);

  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(sessionSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (sessionSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [sessionSeconds]);

  return {
    messages,
    sessionActive,
    sessionSeconds,
    formattedDuration,
    isRecording,
    inputMode,
    isProcessingResponse,
    startSession,
    endSession,
    sendTextMessage,
    startRecording,
    stopRecording,
    toggleInputMode,
  };
};
