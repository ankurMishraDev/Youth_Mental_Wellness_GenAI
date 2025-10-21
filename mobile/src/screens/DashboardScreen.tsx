import { useEffect } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { Button } from "@/components/Button"
import { Card, CardContent, CardHeader } from "@/components/Card"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useAuth } from "@/contexts/AuthContext"
import { RootStackParamList } from "@/navigation/AppNavigator"

const wellnessHighlights = [
  {
    title: "Daily reflection",
    body: "Take a 3-minute check-in to log your thoughts and emotions.",
  },
  {
    title: "Guided breathing",
    body: "Follow our paced breathing exercise whenever you need a reset.",
  },
  {
    title: "Progress tracker",
    body: "Visualise your streaks and celebrate your wins each week.",
  },
]

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user, logout, refreshProfile } = useAuth()

  useEffect(() => {
    refreshProfile().catch(() => {
      // non-blocking
    })
  }, [refreshProfile])

  const handleLogout = async () => {
    await logout()
    navigation.reset({ index: 0, routes: [{ name: "Landing" }] })
  }

  return (
    <ScrollView
      className="flex-1 bg-surface dark:bg-surface-dark"
      contentContainerStyle={{ padding: 24, paddingBottom: 56 }}
    >
      <View className="mt-12 gap-6">
        <Text className="text-3xl font-display text-surface-foreground dark:text-surface-dark-foreground">
          Hi {user?.name || "there"}
        </Text>
        <Text className="text-base text-surface-foreground/80 dark:text-surface-dark-foreground/80">
          You're building a strong support routine. Jump back into your session or explore today's curated
          exercises.
        </Text>

        <Card className="gap-4">
          <CardHeader title="Quick actions" subtitle="Stay connected with your mentor" />
          <CardContent className="gap-3">
            <Button
              title="Start a live session"
              onPress={() => navigation.navigate("Session")}
              fullWidth
            />
            <Button
              title="Update profile"
              variant="outline"
              onPress={() => Alert.alert("Coming soon", "Profile editing will ship in the next sprint.")}
              fullWidth
            />
            <Button title="Logout" variant="ghost" onPress={handleLogout} fullWidth />
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader title="Design preferences" subtitle="Switch modes anytime" />
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader title="Wellness toolkit" subtitle="Highlights from the CureZ library" />
          <CardContent className="gap-4">
            {wellnessHighlights.map((item) => (
              <View
                key={item.title}
                className="bg-surface-muted dark:bg-surface-dark-muted rounded-2xl p-4 gap-2"
              >
                <Text className="text-lg font-heading text-surface-foreground dark:text-surface-dark-foreground">
                  {item.title}
                </Text>
                <Text className="text-sm leading-6 text-surface-foreground/70 dark:text-surface-dark-foreground/70">
                  {item.body}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  )
}
