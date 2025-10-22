import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { AuthProvider, useAuth } from "../src/contexts/AuthContext"

const AppLayout = () => {
  const { user, isLoading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) {
      return
    }

    const inAuthGroup = segments[0] === "(auth)"

    if (user && inAuthGroup) {
      router.replace("/(app)/dashboard")
    } else if (!user && !inAuthGroup) {
      router.replace("/(auth)/landing")
    }
  }, [user, segments, isLoading, router])

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  )
}

const RootLayout = () => {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  )
}

export default RootLayout
