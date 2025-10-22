import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { View, Text } from "react-native";

import { colors } from "../../src/constants/theme";

const tabIcons: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  home: "home",
  sessions: "clock",
  resources: "bookmark",
  profile: "user",
};

const DashboardLayout = () => {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 12,
          paddingTop: 12,
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const iconName = tabIcons[route.name] || "circle";
          return (
            <View className="items-center">
              <View
                className={`mb-1 rounded-full px-3 py-1 ${
                  focused ? "bg-primary/10" : "bg-transparent"
                }`}
              >
                <Feather
                  name={iconName}
                  size={22}
                  color={focused ? colors.primary : colors.muted}
                />
              </View>
              <Text
                className={`font-[Inter_500Medium] text-xs ${
                  focused ? "text-primary" : "text-muted"
                }`}
              >
                {route.name.charAt(0).toUpperCase() + route.name.slice(1)}
              </Text>
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="sessions" />
      <Tabs.Screen name="resources" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
};

export default DashboardLayout;
