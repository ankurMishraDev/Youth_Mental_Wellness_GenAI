import { useMemo } from "react"
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useTheme } from "@/contexts/ThemeContext"
import { useAuth } from "@/contexts/AuthContext"
import { LandingScreen } from "@/screens/LandingScreen"
import { AuthScreen } from "@/screens/AuthScreen"
import { DashboardScreen } from "@/screens/DashboardScreen"
import { SessionScreen } from "@/screens/SessionScreen"

export type RootStackParamList = {
  Landing: undefined
  Auth: undefined
  Dashboard: undefined
  Session: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export const AppNavigator: React.FC = () => {
  const { scheme } = useTheme()
  const { user } = useAuth()

  const initialRoute = useMemo(() => (user ? "Dashboard" : "Landing"), [user])

  return (
    <NavigationContainer theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Session" component={SessionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
