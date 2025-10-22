import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";

const LandingScreen = () => {
  const router = useRouter();
  const player = useVideoPlayer(require("../../assets/videos/hero.mp4"), (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <View className="flex-1">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute inset-0 bg-primary/20" />
      <View className="flex-1 justify-end items-center p-8">
        <Text className="text-4xl font-heading text-white text-center mb-4">
          Your AI-Powered Guide to{" "}
          <Text className="text-secondary">Mental Wellness</Text>
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          className="bg-primary rounded-full px-8 py-4"
        >
          <Text className="text-primary-foreground text-lg font-sans">
            Start Your Wellness Journey
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default LandingScreen;
