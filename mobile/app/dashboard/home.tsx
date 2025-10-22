import { useCallback } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../src/contexts/AuthContext";
import { useDashboardData } from "../../src/hooks/useDashboardData";
import { MoodDial } from "../../src/components/MoodDial";
import { SectionHeading } from "../../src/components/SectionHeading";
import { InfoBanner } from "../../src/components/InfoBanner";
import { SessionSummaryCard } from "../../src/components/SessionSummaryCard";
import { colors } from "../../src/constants/theme";

const HomeScreen = () => {
  const { setCurrentView, currentUser } = useAuth();
  const { isLoading, refresh, moodData, latestSummary, tip, positiveQuote } = useDashboardData();

  const handleStartSession = useCallback(() => {
    setCurrentView("session");
  }, [setCurrentView]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-10">
          <Text className="font-[Inter_700Bold] text-3xl text-foreground">
            Hi {currentUser?.name ? currentUser.name.split(" ")[0] : "there"} 👋
          </Text>
          <Text className="mt-2 font-[Inter_400Regular] text-sm text-muted">
            Your wellbeing dashboard reflects the highlights from your recent AI sessions.
          </Text>
        </View>

        <View className="mt-8 items-center">
          <MoodDial
            value={moodData?.mood_percentage ?? 72}
            label="Emotional Balance"
            mood={moodData?.mood ?? "Optimistic"}
          />
        </View>

        <Pressable
          onPress={handleStartSession}
          className="mt-8 rounded-3xl bg-primary px-6 py-5"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="font-[Inter_700Bold] text-lg text-white">Start a live session</Text>
              <Text className="mt-2 font-[Inter_400Regular] text-xs text-white/80">
                Your mentor is ready to listen and guide you through any emotions or goals you want to explore today.
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <Feather name="mic" size={22} color="#fff" />
            </View>
          </View>
        </Pressable>

        <View className="mt-10">
          <SectionHeading title="Wellness tip" subtitle="Updated every 12 hours" />
          <InfoBanner
            title="Stay mindful"
            description={tip}
            icon={
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Feather name="sun" size={20} color={colors.primary} />
              </View>
            }
          />
        </View>

        <View className="mt-8">
          <SectionHeading title="Positive affirmation" subtitle="A boost just for you" />
          <InfoBanner
            title="Remember"
            description={positiveQuote}
            icon={
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Feather name="star" size={20} color={colors.primary} />
              </View>
            }
          />
        </View>

        {latestSummary && (
          <View className="mt-10">
            <SectionHeading
              title="Latest session recap"
              subtitle="Key insights from your last conversation"
            />
            <SessionSummaryCard summary={latestSummary} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
