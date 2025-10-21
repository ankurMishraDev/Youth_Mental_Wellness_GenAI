import { useState } from "react"
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { useAuth } from "@/contexts/AuthContext"
import { useChatSession } from "@/hooks/useChatSession"
import { RootStackParamList } from "@/navigation/AppNavigator"

export const SessionScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user } = useAuth()
  const { messages, sendTextMessage, isSending } = useChatSession(user?.uid)
  const [text, setText] = useState("")

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    setText("")
    try {
      await sendTextMessage(trimmed)
    } catch (error) {
      Alert.alert("Connection issue", "We couldn't deliver your message. Please try again.")
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface dark:bg-surface-dark"
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View className="flex-1 p-4">
        <Card className="flex-1">
          <View className="items-center gap-2 mb-4">
            <Text className="text-2xl font-heading text-surface-foreground dark:text-surface-dark-foreground">
              Live mentor session
            </Text>
            <Text className="text-sm text-surface-foreground/70 dark:text-surface-dark-foreground/70">
              We are using the same CureZ intelligence from the web app, optimised for mobile chat.
            </Text>
          </View>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
            renderItem={({ item }) => (
              <View
                className={`max-w-[85%] px-4 py-3 rounded-3xl ${
                  item.sender === "user"
                    ? "self-end bg-brand text-brand-foreground"
                    : "self-start bg-surface-muted dark:bg-surface-dark-muted text-surface-foreground dark:text-surface-dark-foreground"
                }`}
              >
                <Text className="text-base leading-6">{item.text}</Text>
              </View>
            )}
          />
          <View className="mt-auto gap-3">
            <Text className="text-xs text-center text-surface-foreground/60 dark:text-surface-dark-foreground/60">
              Voice sessions are coming soon to mobile. For now, continue chatting via text and review the
              summary later on the dashboard.
            </Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="flex-1 rounded-2xl border border-surface-strong dark:border-surface-dark-strong px-4 py-3 text-base text-surface-foreground dark:text-surface-dark-foreground bg-white dark:bg-surface-dark-muted"
                placeholder="Share how you're feeling..."
                placeholderTextColor="#94A3B8"
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={2}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <Button
                title={isSending ? "Sending..." : "Send"}
                onPress={handleSend}
                variant="secondary"
                className="px-6"
              />
            </View>
            <Button
              title="End session"
              variant="ghost"
              onPress={() => navigation.goBack()}
              fullWidth
            />
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  )
}
