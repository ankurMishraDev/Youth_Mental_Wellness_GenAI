import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

import { gradients } from "../constants/theme";

interface GradientCardProps {
  colorsOverride?: string[];
  children: ReactNode;
  className?: string;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  colorsOverride,
  children,
  className,
}) => {
  return (
    <LinearGradient
      colors={colorsOverride || gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}
    >
      <View
        className={`rounded-xl border border-white/10 bg-black/10 p-5 ${className || ""}`}
      >
        {children}
      </View>
    </LinearGradient>
  );
};
