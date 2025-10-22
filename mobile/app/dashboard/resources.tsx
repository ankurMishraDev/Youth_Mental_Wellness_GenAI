import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useDashboardData } from "../../src/hooks/useDashboardData";
import { ExerciseCard } from "../../src/components/ExerciseCard";
import { SectionHeading } from "../../src/components/SectionHeading";
import type { Exercise } from "../../src/types";

const ResourcesScreen = () => {
  const { suggestedExercises, allExercises } = useDashboardData();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const closeModal = () => setSelectedExercise(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-10">
          <SectionHeading
            title="Your recommended exercises"
            subtitle="Hand-picked after your latest session"
          />
          <View className="space-y-4">
            {(suggestedExercises.length ? suggestedExercises : allExercises.slice(0, 3)).map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} onPress={setSelectedExercise} />
            ))}
          </View>
        </View>

        <View className="mt-10">
          <SectionHeading title="Explore the full library" subtitle="Discover calming practices anytime" />
          <View className="space-y-4">
            {allExercises.slice(0, 6).map((exercise) => (
              <ExerciseCard key={`library-${exercise.id}`} exercise={exercise} onPress={setSelectedExercise} />
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!selectedExercise} transparent animationType="slide" onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-surface p-6">
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/20" />
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="font-[Inter_700Bold] text-xl text-foreground">
                  {selectedExercise?.exercise_name}
                </Text>
                <Text className="mt-2 font-[Inter_400Regular] text-sm text-muted">
                  {selectedExercise?.procedure}
                </Text>
                <View className="mt-4 flex-row items-center gap-2">
                  <Feather name="clock" size={16} color="#f97316" />
                  <Text className="font-[Inter_500Medium] text-xs text-muted">
                    {selectedExercise?.expected_time_to_complete || "5 mins"}
                  </Text>
                </View>
              </View>
              <Pressable onPress={closeModal} className="-mr-2 p-2">
                <Feather name="x" size={22} color="#94a3b8" />
              </Pressable>
            </View>
            {selectedExercise?.video_link ? (
              <Pressable className="mt-6 flex-row items-center justify-center gap-2 rounded-full bg-primary px-5 py-3">
                <Feather name="play" size={18} color="#fff" />
                <Text className="font-[Inter_600SemiBold] text-sm text-white">Play guided video</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ResourcesScreen;
