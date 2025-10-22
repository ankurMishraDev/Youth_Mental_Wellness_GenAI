import { View, ActivityIndicator } from "react-native";

const StartPage = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#ea580c" />
    </View>
  );
};

export default StartPage;
