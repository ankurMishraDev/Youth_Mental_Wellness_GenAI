import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../src/contexts/AuthContext";
import { useLiveSession } from "../src/hooks/useLiveSession";
import { gradients } from "../src/constants/theme";

const SessionScreen = () => {
  const { currentUser, setCurrentView } = useAuth();
  const [textMessage, setTextMessage] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);

  const {
    messages,
    sessionActive,
    startSession,
    endSession,
    sendTextMessage,
    inputMode,
    toggleInputMode,
    isRecording,
    startRecording,
    stopRecording,
    formattedDuration,
    isProcessingResponse,
  } = useLiveSession(currentUser);

  useEffect(() => {
    startSession();
    return () => {
      endSession();
    };
  }, [startSession, endSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleLeave = () => {
    endSession();
    setCurrentView("dashboard");
  };

  const handleSend = () => {
    if (!textMessage.trim()) return;
    sendTextMessage(textMessage);
    setTextMessage("");
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <LinearGradient colors={gradients.session} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-6 pt-6">
              <Pressable onPress={handleLeave} className="rounded-full bg-black/30 px-4 py-2">
                <Text className="font-[Inter_500Medium] text-sm text-white">Exit</Text>
              </Pressable>
              <View className="items-center">
                <Text className="font-[Inter_600SemiBold] text-white">Live session</Text>
                <Text className="font-[Inter_400Regular] text-xs text-white/80">
                  {sessionActive ? formattedDuration : "Connecting"}
                </Text>
              </View>
              <Pressable onPress={toggleInputMode} className="rounded-full bg-black/30 px-4 py-2">
                <Text className="font-[Inter_500Medium] text-sm text-white">
                  {inputMode === "audio" ? "Use text" : "Use voice"}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              ref={(node) => {
                scrollRef.current = node;
              }}
              className="mt-8 flex-1 px-6"
              contentContainerStyle={{ paddingBottom: 160 }}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  className={`mb-3 max-w-[85%] rounded-3xl px-4 py-3 ${
                    message.sender === "user"
                      ? "self-end bg-white/20"
                      : "self-start bg-black/30"
                  }`}
                >
                  <Text
                    className={`font-[Inter_500Medium] text-sm ${
                      message.sender === "user" ? "text-white" : "text-white"
                    }`}
                  >
                    {message.text}
                  </Text>
                </View>
              ))}
              {isProcessingResponse && (
                <View className="mb-3 self-start rounded-3xl bg-black/30 px-4 py-3">
                  <Text className="font-[Inter_500Medium] text-sm text-white/80">CureZ is responding…</Text>
                </View>
              )}
            </ScrollView>
          </View>

          <View className="absolute bottom-0 left-0 right-0 px-6 pb-6">
            <View className="rounded-3xl bg-black/35 p-4">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={handleToggleRecording}
                  className={`h-14 w-14 items-center justify-center rounded-full ${
                    isRecording ? "bg-red-500" : "bg-primary"
                  }`}
                >
                  <Feather name={isRecording ? "square" : "mic"} size={22} color="#fff" />
                </Pressable>
                {inputMode === "text" && (
                  <View className="ml-4 flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-2">
                    <TextInput
                      value={textMessage}
                      onChangeText={setTextMessage}
                      placeholder="Type your message"
                      placeholderTextColor="rgba(248,250,252,0.6)"
                      multiline
                      style={{ maxHeight: 80 }}
                      className="font-[Inter_500Medium] text-sm text-white"
                    />
                  </View>
                )}
                <Pressable
                  onPress={handleSend}
                  disabled={inputMode !== "text" || !textMessage.trim()}
                  className="ml-4 h-12 w-12 items-center justify-center rounded-full bg-white/15"
                >
                  <Feather name="send" size={18} color="#fff" />
                </Pressable>
              </View>
              <Text className="mt-3 text-center font-[Inter_400Regular] text-xs text-white/70">
                {inputMode === "audio"
                  ? isRecording
                    ? "Recording… tap to stop when you're ready"
                    : "Tap the mic to share how you're feeling"
                  : "Switch back to voice when you want to speak freely"}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default SessionScreen;
