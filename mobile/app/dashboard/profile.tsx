import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../src/contexts/AuthContext";
import { SectionHeading } from "../../src/components/SectionHeading";
import { ProfileField } from "../../src/components/ProfileField";
import { updateUserProfile } from "../../src/lib/profile";

const ProfileScreen = () => {
  const { currentUser, updateCurrentUser, handleLogout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name ?? "");
      setAge(currentUser.age ? String(currentUser.age) : "");
      setGender(currentUser.gender ?? "");
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!name.trim() && !age.trim() && !gender.trim()) {
      Alert.alert("Nothing to update", "Add a new value before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUserProfile(
        {
          uid: currentUser.uid,
          name: name.trim() || undefined,
          age: age.trim() ? age.trim() : undefined,
          gender: gender.trim() || undefined,
        },
        currentUser
      );
      await updateCurrentUser(updated);
      Alert.alert("Profile updated", "Your preferences are now synced across devices.");
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      Alert.alert("Update failed", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      setName(currentUser.name ?? "");
      setAge(currentUser.age ? String(currentUser.age) : "");
      setGender(currentUser.gender ?? "");
    }
    setIsEditing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-10">
          <SectionHeading
            title="Your profile"
            subtitle="Manage the details we use to personalize your sessions"
          />
        </View>

        <View className="mt-4 rounded-3xl border border-white/5 bg-surface p-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-[Inter_700Bold] text-xl text-foreground">
                {currentUser?.name || "Complete your profile"}
              </Text>
              <Text className="mt-1 font-[Inter_400Regular] text-xs text-muted">
                {currentUser?.email}
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Feather name="user" size={22} color="#f97316" />
            </View>
          </View>

          <View className="mt-6">
            <ProfileField label="Name" value={name} editable={isEditing} onChangeText={setName} />
            <ProfileField
              label="Age"
              value={age}
              editable={isEditing}
              keyboardType="numeric"
              onChangeText={setAge}
            />
            <ProfileField
              label="Gender"
              value={gender}
              editable={isEditing}
              onChangeText={setGender}
            />
          </View>

          <View className="mt-6 flex-row justify-end gap-3">
            {isEditing ? (
              <>
                <Pressable onPress={handleCancel} className="rounded-full border border-white/10 px-5 py-2">
                  <Text className="font-[Inter_500Medium] text-sm text-muted">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  className="rounded-full bg-primary px-5 py-2"
                  disabled={isSaving}
                >
                  <Text className="font-[Inter_600SemiBold] text-sm text-white">
                    {isSaving ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => setIsEditing(true)} className="rounded-full border border-primary px-5 py-2">
                <Text className="font-[Inter_600SemiBold] text-sm text-primary">Edit profile</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => handleLogout()}
          className="mt-8 flex-row items-center justify-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-6 py-3"
        >
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text className="font-[Inter_600SemiBold] text-sm text-red-400">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
