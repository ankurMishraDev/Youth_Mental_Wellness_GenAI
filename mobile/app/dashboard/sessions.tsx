import { useCallback } from "react";
import { RefreshControl, ScrollView, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../src/contexts/AuthContext";
import { useDashboardData } from "../../src/hooks/useDashboardData";
import { SessionSummaryCard } from "../../src/components/SessionSummaryCard";
import { SectionHeading } from "../../src/components/SectionHeading";
import { colors } from "../../src/constants/theme";

const SessionsScreen = () => {
  const { setCurrentView } = useAuth();
  const { latestSummary, refresh, isLoading } = useDashboardData();

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
      >
        <View className="mt-10">
          <SectionHeading
            title="Live AI sessions"
            subtitle="Revisit your progress and hop back in when you're ready"
          />
        </View>

        <Pressable onPress={handleStartSession} className="mt-4 rounded-3xl bg-primary px-6 py-5">
          <View className="flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <Feather name="headphones" size={24} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-[Inter_700Bold] text-base text-white">Start a new conversation</Text>
              <Text className="mt-1 font-[Inter_400Regular] text-xs text-white/75">
                Launch a live CureZ mentor session with voice or text support.
              </Text>
            </View>
          </View>
        </Pressable>

        {latestSummary ? (
          <View className="mt-10">
            <SectionHeading
              title="Most recent session"
              subtitle="Highlights and takeaways saved to your journal"
            />
            <SessionSummaryCard summary={latestSummary} />
          </View>
        ) : (
          <View className="mt-10 rounded-3xl border border-dashed border-white/10 bg-surface p-6">
            <Text className="font-[Inter_600SemiBold] text-base text-foreground">
              No session history yet
            </Text>
            <Text className="mt-2 font-[Inter_400Regular] text-sm text-muted">
              Once you complete a live session, the summary and suggestions will appear here for easy reference.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SessionsScreen;
