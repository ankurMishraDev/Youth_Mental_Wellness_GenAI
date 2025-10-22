import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import { useSession, Message } from "@/hooks/useSession"

const SessionScreen = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const { initializeAudioClient, endSession, sendTextMessage } = useSession(user, setMessages)
  const [text, setText] = useState("")

  useEffect(() => {
    initializeAudioClient()
    return () => {
      endSession()
    }
  }, [])

  const handleSend = () => {
    if (text.trim()) {
      sendTextMessage(text.trim())
      setText("")
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F1F5F9" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <FlatList
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf: item.sender === "user" ? "flex-end" : "flex-start",
                backgroundColor: item.sender === "user" ? "#6366F1" : "white",
                borderRadius: 20,
                padding: 10,
                marginVertical: 5,
                maxWidth: "80%",
              }}
            >
              <Text style={{ color: item.sender === "user" ? "white" : "black" }}>{item.text}</Text>
            </View>
          )}
        />
        <View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: "#E2E8F0", padding: 10 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type your message..."
            style={{ flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 20, padding: 10, marginRight: 10 }}
          />
          <Pressable
            onPress={handleSend}
            style={{ backgroundColor: "#6366F1", padding: 10, borderRadius: 20 }}
          >
            <Text style={{ color: "white" }}>Send</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={{ alignItems: "center", padding: 10 }}
        >
          <Text style={{ color: "#6366F1" }}>End Session</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

export default SessionScreen
