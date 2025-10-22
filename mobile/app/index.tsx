import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

import { useAuth } from "../src/contexts/AuthContext";
import { colors } from "../src/constants/theme";

const StartPage = () => {
  const { status, currentView } = useAuth();

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  switch (currentView) {
    case "landing":
      return <Redirect href="/landing" />;
    case "auth":
      return <Redirect href="/auth" />;
    case "dashboard":
      return <Redirect href="/dashboard" />;
    case "session":
      return <Redirect href="/session" />;
    default:
      return <Redirect href="/landing" />;
  }
};

export default StartPage;
