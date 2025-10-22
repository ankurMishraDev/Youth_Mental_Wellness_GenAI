import { Image, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useVideoPlayer, VideoView } from "expo-video"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { tokens, getAsset } from "@/theme/tokens"

const highlights = [
  "Personalised support backed by the latest mood insights",
  "Bite-sized exercises crafted by licensed therapists",
  "Daily check-ins to keep your wellbeing on track",
]

const LandingScreen = () => {
  const router = useRouter()
  const heroSource = getAsset("hero") ?? require("../../assets/videos/hero.mp4")
  const logoSource = getAsset("logo") ?? require("../../assets/icon.png")

  const player = useVideoPlayer(heroSource, (createdPlayer) => {
    createdPlayer.loop = true
    createdPlayer.play()
  })

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <VideoView player={player} className="absolute inset-0" />
        <View className="absolute inset-0" style={{ backgroundColor: tokens.colors.overlay }} />
        <View className="flex-1 justify-between px-xl py-2xl">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image source={logoSource} className="h-12 w-12 rounded-xl mr-sm" resizeMode="contain" />
              <View>
                <Text className="text-xl font-semibold text-foreground">CureZ</Text>
                <Text className="text-sm text-muted">Youth Mental Wellness Companion</Text>
              </View>
            </View>
            <Badge variant="soft" className="bg-primary/20 border border-primary/40">
              Trusted by 12k+ teens
            </Badge>
          </View>

          <View className="mt-auto">
            <Text className="text-3xl font-semibold text-foreground leading-snug">
              Your AI-powered guide to
              <Text className="text-secondary"> mental resilience.</Text>
            </Text>
            <Text className="text-base text-subtle mt-md">
              Build healthy habits, track your mood, and connect with compassionate support any time of day.
            </Text>

            <View className="space-y-sm mt-xl">
              {highlights.map((item) => (
                <View key={item} className="flex-row items-start">
                  <View className="h-2.5 w-2.5 rounded-full bg-secondary mt-1.5 mr-sm" />
                  <Text className="flex-1 text-sm text-foreground/80">{item}</Text>
                </View>
              ))}
            </View>

            <Button
              onPress={() => router.push("/(auth)/login")}
              size="lg"
              className="mt-2xl"
            >
              Start your wellness journey
            </Button>
            <Text className="text-xs text-muted mt-sm">
              Secure. Evidence-informed. Designed alongside youth mental health experts.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default LandingScreen
