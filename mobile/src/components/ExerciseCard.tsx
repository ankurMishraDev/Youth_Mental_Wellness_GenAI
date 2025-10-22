import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { Exercise } from "../types";
import { GradientCard } from "./GradientCard";

interface ExerciseCardProps {
  exercise: Exercise;
  onPress?: (exercise: Exercise) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onPress }) => {
  return (
    <Pressable onPress={() => onPress?.(exercise)} className="active:opacity-90">
      <GradientCard>
        <View className="flex-row items-start gap-4">
          <View className="mt-1 h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Feather name="heart" size={20} color="#f97316" />
          </View>
          <View className="flex-1">
            <Text className="font-[Inter_600SemiBold] text-lg text-foreground">
              {exercise.exercise_name}
            </Text>
            <Text className="mt-2 font-[Inter_400Regular] text-xs leading-5 text-muted">
              {exercise.procedure}
            </Text>
            <View className="mt-4 flex-row items-center gap-2">
              <Feather name="clock" size={14} color="#f97316" />
              <Text className="font-[Inter_500Medium] text-xs text-muted">
                {exercise.expected_time_to_complete || "5 mins"}
              </Text>
            </View>
          </View>
        </View>
      </GradientCard>
    </Pressable>
  );
};
