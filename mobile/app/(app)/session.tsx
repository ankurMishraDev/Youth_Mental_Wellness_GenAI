import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import { useSession, type Message } from "@/hooks/useSession"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, formatTime } from "@/lib/utils"
import { tokens } from "@/theme/tokens"

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.sender === "user"
  return (
    <View
      className={cn(
        "max-w-[85%] rounded-xl px-lg py-sm",
        isUser ? "self-end bg-primary" : "self-start bg-surface"
      )}
      style={{
        shadowColor: "rgba(15,23,42,0.25)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <Text className={cn("text-sm", isUser ? "text-primary-foreground" : "text-foreground/90")}>{message.text}</Text>
    </View>
  )
}

const SessionScreen = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const listRef = useRef<FlatList<Message>>(null)

  const {
    initializeAudioClient,
    endSession,
    sendTextMessage,
    sessionSeconds,
    sessionActive,
    isRecording,
    isAudioPlaying,
  } = useSession(user, setMessages)

  useEffect(() => {
    initializeAudioClient().catch((error) => {
      console.error("Failed to start session", error)
    })
    return () => {
      endSession()
    }
  }, [])

  const handleSend = () => {
    if (!input.trim()) {
      return
    }
    sendTextMessage(input.trim())
    setInput("")
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-xl pt-xl">
          <View className="flex-row items-center justify-between mb-lg">
            <View>
              <Text className="text-sm text-subtle">Live with CureZ</Text>
              <Text className="text-xl font-semibold text-foreground mt-1">Therapeutic conversation</Text>
            </View>
            <View className="items-end">
              <Badge variant="soft" className="mb-1">
                {sessionActive ? "Active" : "Connecting"}
              </Badge>
              <Text className="text-xs text-muted">{formatTime(sessionSeconds)}</Text>
            </View>
          </View>

          <View className="flex-1 rounded-lg bg-card border border-border/40 px-md py-md">
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => <MessageBubble message={item} />}
              ItemSeparatorComponent={() => <View className="h-sm" />}
              contentContainerStyle={{ paddingVertical: 8 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
            {isRecording || isAudioPlaying ? (
              <View className="flex-row items-center bg-primary/10 rounded-lg px-md py-sm">
                <ActivityIndicator size="small" color={tokens.colors.secondary.DEFAULT} />
                <Text className="text-xs text-secondary font-medium ml-sm">
                  {isRecording ? "Listening..." : "CureZ is thinking"}
                </Text>
              </View>
            ) : null}
          </View>

        </View>
        <View className="px-xl pb-xl">
          <View className="flex-row items-center bg-surface border border-border rounded-full px-md py-xs">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Share what's on your mind..."
              placeholderTextColor={tokens.colors.muted}
              className="flex-1 text-foreground px-sm"
              multiline
              maxLength={400}
            />
            <Button size="sm" onPress={handleSend} disabled={!input.trim()}>
              Send
            </Button>
          </View>
          <Button
            variant="ghost"
            size="sm"
            className="mt-sm"
            textClassName="text-secondary"
            onPress={() => {
              endSession()
              router.replace("/(app)/dashboard")
            }}
          >
            End session & return to dashboard
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default SessionScreen
