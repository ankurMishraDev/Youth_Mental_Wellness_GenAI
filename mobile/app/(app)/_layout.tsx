import { Stack } from "expo-router"

const AppLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="session" options={{ headerShown: false }} />
    </Stack>
  )
}

export default AppLayout
