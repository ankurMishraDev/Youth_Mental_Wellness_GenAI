import { useEffect } from "react"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { AppNavigator } from "@/navigation/AppNavigator"

SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore */
})

const RootNavigation: React.FC = () => {
  const { scheme } = useTheme()

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      /* ignore */
    })
  }, [])

  return (
    <>
      <AppNavigator />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </ThemeProvider>
  )
}
