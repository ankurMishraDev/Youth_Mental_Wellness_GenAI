import { useMemo, useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@/contexts/AuthContext"
import { login, requestPasswordReset, signup } from "@/services/auth"
import type { AuthMode } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const genders = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-to-say" },
]

const LoginScreen = () => {
  const { setUser } = useAuth()
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [forgotPassword, setForgotPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")

  const primaryActionLabel = useMemo(() => {
    if (forgotPassword) {
      return "Send reset link"
    }
    return authMode === "login" ? "Login" : "Create account"
  }, [authMode, forgotPassword])

  const toggleMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setForgotPassword(false)
  }

  const resetForm = () => {
    setPassword("")
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      if (forgotPassword) {
        await requestPasswordReset(email)
        Alert.alert(
          "Reset email sent",
          "Check your inbox for a link to reset your password."
        )
        setForgotPassword(false)
        return
      }

      if (authMode === "login") {
        const user = await login(email, password)
        setUser(user)
      } else {
        await signup({ email, password, name, age, gender })
        Alert.alert(
          "Account created",
          "Verify your email through the link we just sent before logging in."
        )
        setAuthMode("login")
        resetForm()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong"
      Alert.alert("Let's try that again", message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-xl py-2xl">
          <Card className="bg-card/95 border border-border/40">
            <CardHeader className="items-center">
              <Badge variant="soft" className="bg-secondary/20 border border-secondary/30">
                Secure Firebase authentication
              </Badge>
              <CardTitle className="text-2xl mt-md">{forgotPassword ? "Reset password" : authMode === "login" ? "Welcome back" : "Create your profile"}</CardTitle>
              <CardDescription>
                {forgotPassword
                  ? "We will email you a reset link."
                  : "Access your personalised mental wellness companion."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-lg">
              <View className="flex-row bg-surface rounded-pill p-2xs">
                {["login", "signup"].map((mode) => {
                  const typedMode = mode as AuthMode
                  const isActive = authMode === typedMode && !forgotPassword
                  return (
                    <Button
                      key={mode}
                      onPress={() => toggleMode(typedMode)}
                      variant={isActive ? "primary" : "ghost"}
                      size="sm"
                      className="flex-1"
                      textClassName={isActive ? "text-primary-foreground" : "text-muted"}
                    >
                      {typedMode === "login" ? "Login" : "Sign up"}
                    </Button>
                  )
                })}
              </View>

              {authMode === "signup" && !forgotPassword && (
                <View className="space-y-md">
                  <Input
                    placeholder="Full name"
                    value={name}
                    onChangeText={setName}
                  />
                  <View className="flex-row">
                    <Input
                      placeholder="Age"
                      keyboardType="numeric"
                      value={age}
                      onChangeText={setAge}
                      className="flex-1 mr-sm"
                    />
                    <View className="flex-1">
                      <View className="border border-border bg-surface rounded-lg px-lg py-sm">
                        <Text className="text-xs text-muted mb-1">Gender</Text>
                        {genders.map((option) => {
                          const isSelected = gender === option.value
                          return (
                            <Button
                              key={option.value}
                              variant={isSelected ? "secondary" : "ghost"}
                              size="sm"
                              className="w-full items-start"
                              textClassName={isSelected ? "text-secondary-foreground" : "text-foreground/80"}
                              onPress={() => setGender(option.value)}
                            >
                              {option.label}
                            </Button>
                          )
                        })}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <Input
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              {!forgotPassword && (
                <Input
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              )}

              <Button
                onPress={handleSubmit}
                size="lg"
                disabled={isLoading}
                className="mt-sm"
              >
                {isLoading ? "Please wait..." : primaryActionLabel}
              </Button>

              {!forgotPassword ? (
                <View className="items-center mt-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setForgotPassword(true)}
                    textClassName="text-secondary"
                  >
                    Forgot your password?
                  </Button>
                </View>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setForgotPassword(false)}
                  textClassName="text-secondary"
                >
                  Back to sign in
                </Button>
              )}

              <Text className="text-xs text-muted text-center">
                By continuing you agree to our commitment to safeguarding youth mental health data.
              </Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default LoginScreen
