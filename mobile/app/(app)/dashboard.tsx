import { View, Text, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"

const DashboardScreen = () => {
  const { user, setUser } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    setUser(null)
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Welcome, {user?.name || "User"}
      </Text>
      <Pressable
        onPress={() => router.push("/(app)/session")}
        style={{
          backgroundColor: "#6366F1",
          paddingVertical: 12,
          paddingHorizontal: 32,
          borderRadius: 25,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>Start Session</Text>
      </Pressable>
      <Pressable
        onPress={handleLogout}
        style={{
          backgroundColor: "#EF4444",
          paddingVertical: 12,
          paddingHorizontal: 32,
          borderRadius: 25,
        }}
      >
        <Text style={{ color: "white", fontSize: 16 }}>Logout</Text>
      </Pressable>
    </View>
  )
}

export default DashboardScreen
