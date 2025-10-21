import { API_BASE_URL } from "@/services/config"

export type ChatMessage = {
  id: string
  text: string
  sender: "user" | "assistant"
  createdAt: string
}

export type SessionReply = {
  reply: string
}

export const sendSessionMessage = async (
  message: string,
  options: { userId?: string } = {}
): Promise<SessionReply> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/mobile-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, userId: options.userId }),
    })

    if (response.ok) {
      const data = (await response.json()) as SessionReply
      if (data?.reply) {
        return data
      }
    }
  } catch (error) {
    console.warn("Falling back to local session response", error)
  }

  return {
    reply:
      "Thank you for sharing. I'm still getting connected to the live mentor service, but I'm here to listen. Try again once your network is ready.",
  }
}
