import { useCallback } from "react"
import { View, Text, ScrollView, Image } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { Button } from "@/components/Button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { RootStackParamList } from "@/navigation/AppNavigator"

const HERO_URI =
  "https://images.unsplash.com/photo-1527628173875-3c7bfd28ad78?auto=format&fit=crop&w=900&q=80"

export const LandingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const handleBegin = useCallback(() => {
    navigation.navigate("Auth")
  }, [navigation])

  return (
    <ScrollView className="flex-1 bg-surface dark:bg-surface-dark" contentContainerStyle={{ padding: 24 }}>
      <View className="mt-12 gap-8">
        <Text className="text-4xl font-display text-surface-foreground dark:text-surface-dark-foreground">
          CureZ
        </Text>
        <Text className="text-2xl font-heading text-surface-foreground/80 dark:text-surface-dark-foreground/80">
          A mindful companion for young people navigating their wellness journey.
        </Text>
        <Image
          source={{ uri: HERO_URI }}
          resizeMode="cover"
          className="w-full h-56 rounded-3xl"
          accessible
          accessibilityLabel="Illustration of a person finding calm with the help of a friendly mentor"
        />
        <Text className="text-base leading-6 text-surface-foreground/80 dark:text-surface-dark-foreground/80">
          Bring the full CureZ experience with you. Check in with your mentor, track your progress, and
          explore exercises designed for your daily routine right from your phone.
        </Text>
        <Button title="Begin your journey" onPress={handleBegin} fullWidth className="mt-4" />
        <View className="bg-surface-muted dark:bg-surface-dark-muted rounded-3xl p-6 gap-4">
          <Text className="text-lg font-heading text-surface-foreground dark:text-surface-dark-foreground">
            Unified design system
          </Text>
          <Text className="text-base leading-6 text-surface-foreground/70 dark:text-surface-dark-foreground/70">
            Colors, fonts, and spacing are all powered by the shared Tailwind theme. Update the palette in
            <Text className="font-semibold"> tailwind.config.js </Text> to refresh the entire app instantly.
          </Text>
          <ThemeToggle />
        </View>
      </View>
    </ScrollView>
  )
}
