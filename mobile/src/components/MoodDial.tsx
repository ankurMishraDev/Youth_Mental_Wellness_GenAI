import { View, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";

interface MoodDialProps {
  value?: number;
  label?: string;
  mood?: string;
}

export const MoodDial: React.FC<MoodDialProps> = ({ value = 0, label = "Mood", mood }) => {
  const radius = 64;
  const strokeWidth = 12;
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalizedValue / 100);

  return (
    <View className="items-center justify-center">
      <Svg width={(radius + strokeWidth) * 2} height={(radius + strokeWidth) * 2}>
        <Defs>
          <SvgLinearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#f97316" />
            <Stop offset="100%" stopColor="#fb923c" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="font-[Inter_700Bold] text-3xl text-foreground">{normalizedValue}%</Text>
        <Text className="mt-1 font-[Inter_500Medium] text-sm text-muted">{label}</Text>
        {mood && <Text className="mt-1 font-[Inter_600SemiBold] text-base text-primary">{mood}</Text>}
      </View>
    </View>
  );
};
