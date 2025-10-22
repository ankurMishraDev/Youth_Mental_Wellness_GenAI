import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { SessionSummary } from "../types";
import { GradientCard } from "./GradientCard";

interface SessionSummaryCardProps {
  summary: SessionSummary;
}

export const SessionSummaryCard: React.FC<SessionSummaryCardProps> = ({ summary }) => {
  const createdAt = new Date(summary.createdAt);
  const formattedDate = createdAt.toLocaleString();

  return (
    <GradientCard>
      <View className="flex-row items-start gap-3">
        <View className="mt-1 h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
          <Feather name="message-circle" size={18} color="#f97316" />
        </View>
        <View className="flex-1">
          <Text className="font-[Inter_600SemiBold] text-base text-foreground">Recent Session</Text>
          <Text className="mt-1 font-[Inter_400Regular] text-xs text-muted">{formattedDate}</Text>
          {summary.summary_data.highlights?.length ? (
            <View className="mt-3 space-y-2">
              {summary.summary_data.highlights.slice(0, 3).map((highlight, index) => (
                <View key={`${highlight}-${index}`} className="flex-row items-start gap-2">
                  <View className="mt-1">
                    <Feather name="check-circle" size={16} color="#f97316" />
                  </View>
                  <Text className="flex-1 font-[Inter_400Regular] text-sm text-foreground">
                    {highlight}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="mt-3 font-[Inter_400Regular] text-sm text-muted">
              Your next session summary will appear here.
            </Text>
          )}
        </View>
      </View>
    </GradientCard>
  );
};
