import type { ReactNode } from "react";
import { View, Text } from "react-native";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, action }) => {
  return (
    <View className="mb-4 flex-row items-end justify-between">
      <View className="flex-1 pr-3">
        <Text className="font-[Inter_700Bold] text-xl text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 font-[Inter_400Regular] text-xs text-muted">{subtitle}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
};
