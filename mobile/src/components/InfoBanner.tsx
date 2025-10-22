import type { ReactNode } from "react";
import { View, Text } from "react-native";

import { GradientCard } from "./GradientCard";

interface InfoBannerProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export const InfoBanner: React.FC<InfoBannerProps> = ({ title, description, icon }) => {
  return (
    <GradientCard>
      <View className="flex-row items-start gap-4">
        {icon}
        <View className="flex-1">
          <Text className="font-[Inter_600SemiBold] text-base text-foreground">{title}</Text>
          <Text className="mt-1 font-[Inter_400Regular] text-sm text-muted">{description}</Text>
        </View>
      </View>
    </GradientCard>
  );
};
