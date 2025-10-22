import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/section-header"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { useDashboardData } from "@/hooks/useDashboardData"
import { tokens } from "@/theme/tokens"

const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  return `${Math.round(value)}%`
}

const formatHours = (value: number | null | undefined) => {
  if (!value || Number.isNaN(value)) return "—"
  return `${Math.round(value * 10) / 10}h`
}

const formatText = (value: string | null | undefined) => {
  if (!value) return "Not yet shared"
  return value
}

const DashboardScreen = () => {
  const { user, setUser } = useAuth()
  const router = useRouter()
  const {
    moodData,
    sessionSummary,
    suggestedExercises,
    wellbeingTip,
    positiveAffirmation,
    isLoading,
    error,
    refresh,
  } = useDashboardData(user?.uid)

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-xl pt-2xl space-y-2xl">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-md">
              <Text className="text-sm text-subtle">Hello, {user?.name || "friend"}</Text>
              <Text className="text-2xl font-semibold text-foreground mt-1">
                Your mental wellness hub
              </Text>
              <Text className="text-sm text-muted mt-2">
                Track your mood, follow expert-designed exercises, and reflect on each conversation with CureZ.
              </Text>
            </View>
            <View className="items-end">
              <Button variant="outline" size="sm" onPress={() => setUser(null)}>
                Logout
              </Button>
            </View>
          </View>

          <Card className="bg-card/95 border border-border/30">
            <CardHeader>
              <CardTitle>Today's encouragement</CardTitle>
              <CardDescription>{positiveAffirmation}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-md">
              <Badge variant="soft" className="self-start bg-primary/15 border border-primary/30">
                Wellbeing focus
              </Badge>
              <Text className="text-base text-foreground/90">{wellbeingTip}</Text>
              <View className="flex-row">
                <Button className="flex-1 mr-sm" size="md" onPress={() => router.push("/(app)/session")}>
                  Start a new session
                </Button>
                <Button variant="outline" size="md" className="flex-1" onPress={refresh}>
                  Refresh data
                </Button>
              </View>
            </CardContent>
          </Card>

          <View className="space-y-xl">
            <SectionHeader
              title="Mood insights"
              subtitle="Latest highlights from your conversations"
            />
            {isLoading ? (
              <View className="items-center py-xl">
                <ActivityIndicator color={tokens.colors.primary.DEFAULT} />
              </View>
            ) : moodData ? (
              <View className="space-y-lg">
                <View className="space-y-md">
                  <StatCard label="Current mood" value={moodData.mood} />
                  <StatCard label="Mood score" value={formatPercentage(moodData.mood_percentage)} />
                  <StatCard label="Energy level" value={formatPercentage(moodData.energy_level)} />
                  <StatCard label="Stress level" value={formatPercentage(moodData.stress_level)} />
                </View>

                <Card>
                  <CardHeader>
                    <CardTitle>Wellness snapshot</CardTitle>
                    <CardDescription>
                      Key lifestyle signals from your recent reflections
                    </CardDescription>
                  </CardHeader>
                <CardContent className="space-y-md">
                    <View>
                      <Text className="text-xs text-muted uppercase tracking-widest">Sleep</Text>
                      <Text className="text-base text-foreground mt-1">
                        {moodData.sleep_quality || "Share your sleep quality next time."}
                      </Text>
                      <Text className="text-sm text-muted">Duration: {formatHours(moodData.sleep_duration_hours)}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-muted uppercase tracking-widest">Social connections</Text>
                      <Text className="text-base text-foreground mt-1">
                        {formatText(moodData.social_connection_level)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-muted uppercase tracking-widest">Physical activity</Text>
                      <Text className="text-base text-foreground mt-1">
                        {moodData.physical_activity_summary || "CureZ will recommend activities after your next session."}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              </View>
            ) : (
              <Card className="border-dashed border border-border/40">
                <CardContent className="items-center py-xl">
                  <Text className="text-base text-muted text-center">
                    Start a session to unlock personalised mood trends and recommendations.
                  </Text>
                </CardContent>
              </Card>
            )}

            <View className="space-y-lg">
              <SectionHeader title="Recommended exercises" subtitle="Curated to match your current needs" />
              {suggestedExercises.length ? (
                suggestedExercises.map((exercise) => (
                  <Card key={exercise.id} className="border border-border/30">
                    <CardHeader>
                      <CardTitle>{exercise.exercise_name}</CardTitle>
                      <CardDescription>{exercise.expected_time_to_complete}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-md">
                      <Text className="text-sm text-foreground/80">{exercise.procedure}</Text>
                      <View className="flex-row">
                        <Button
                          size="sm"
                          className="flex-1 mr-sm"
                          onPress={() => router.push("/(app)/session")}
                        >
                          Try with CureZ
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onPress={() => Linking.openURL(exercise.video_link)}
                        >
                          Watch guide
                        </Button>
                      </View>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-dashed border border-border/40">
                  <CardContent>
                    <Text className="text-sm text-muted">
                      You will see tailored exercises here once CureZ has more insight from your sessions.
                    </Text>
                  </CardContent>
                </Card>
              )}
            </View>

            {sessionSummary?.summary_data?.positive_event ? (
              <Card className="bg-accent/20 border border-accent/40">
                <CardHeader>
                  <CardTitle className="text-accent-foreground">Recent bright spot</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text className="text-sm text-foreground/90">
                    {sessionSummary.summary_data.positive_event}
                  </Text>
                </CardContent>
              </Card>
            ) : null}

            {error ? (
              <Text className="text-sm text-destructive text-center">{error}</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default DashboardScreen
