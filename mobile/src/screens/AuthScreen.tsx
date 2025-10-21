import { useState } from "react"
import { Alert, ScrollView, Text, View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { Button } from "@/components/Button"
import { Card, CardContent, CardHeader } from "@/components/Card"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/contexts/AuthContext"
import { RootStackParamList } from "@/navigation/AppNavigator"

export const AuthScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const auth = useAuth()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [forgotPassword, setForgotPassword] = useState(false)

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    name: "",
    age: "",
    gender: "",
  })

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert("Missing information", "Enter your email and password to continue.")
      return
    }
    try {
      await auth.login(loginEmail, loginPassword)
      navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] })
    } catch (error) {
      Alert.alert("Login failed", auth.errorMessage || "Please try again later.")
    }
  }

  const handleSignup = async () => {
    if (!signupForm.email || !signupForm.password || !signupForm.name || !signupForm.age) {
      Alert.alert("Missing information", "Please complete all fields to continue.")
      return
    }
    try {
      await auth.signup(signupForm)
      Alert.alert(
        "Verify your email",
        "We sent a verification link to your inbox. Please verify your account before logging in."
      )
      setMode("login")
      setLoginEmail(signupForm.email)
      setSignupForm({ email: "", password: "", name: "", age: "", gender: "" })
    } catch (error) {
      Alert.alert("Signup failed", auth.errorMessage || "Please try again later.")
    }
  }

  const handlePasswordReset = async () => {
    if (!loginEmail) {
      Alert.alert("Missing email", "Enter your registered email to receive a reset link.")
      return
    }
    try {
      await auth.sendPasswordReset(loginEmail)
      Alert.alert("Reset email sent", "Check your inbox for password reset instructions.")
      setForgotPassword(false)
    } catch (error) {
      Alert.alert("Unable to send reset email", auth.errorMessage || "Please try again later.")
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-surface dark:bg-surface-dark"
      contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: "center" }}
    >
      <Card className="gap-6">
        <CardHeader
          title="Welcome to CureZ"
          subtitle="Your personalised wellbeing mentor, now on mobile"
        />
        <View className="flex-row bg-surface-muted dark:bg-surface-dark-muted rounded-2xl p-1">
          <Button
            title="Login"
            variant={mode === "login" ? "primary" : "ghost"}
            className="flex-1"
            onPress={() => {
              setMode("login")
              setForgotPassword(false)
            }}
          />
          <Button
            title="Sign up"
            variant={mode === "signup" ? "primary" : "ghost"}
            className="flex-1"
            onPress={() => setMode("signup")}
          />
        </View>
        <CardContent>
          {mode === "login" ? (
            <View className="gap-4">
              <TextField
                label="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={loginEmail}
                onChangeText={setLoginEmail}
              />
              {!forgotPassword ? (
                <>
                  <TextField
                    label="Password"
                    secureTextEntry
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                  />
                  <Button
                    title={auth.status === "loading" ? "Signing in..." : "Login"}
                    onPress={handleLogin}
                    fullWidth
                  />
                  <Button
                    title="Forgot password?"
                    variant="ghost"
                    onPress={() => setForgotPassword(true)}
                  />
                </>
              ) : (
                <>
                  <Text className="text-sm text-surface-foreground/80 dark:text-surface-dark-foreground/70">
                    Enter your registered email address. We'll send a password reset link through Firebase.
                  </Text>
                  <Button title="Send reset link" onPress={handlePasswordReset} fullWidth />
                  <Button
                    title="Back to login"
                    variant="ghost"
                    onPress={() => setForgotPassword(false)}
                  />
                </>
              )}
            </View>
          ) : (
            <View className="gap-4">
              <TextField label="Full name" value={signupForm.name} onChangeText={(name) => setSignupForm((prev) => ({ ...prev, name }))} />
              <TextField
                label="Age"
                keyboardType="number-pad"
                value={signupForm.age}
                onChangeText={(age) => setSignupForm((prev) => ({ ...prev, age }))}
              />
              <TextField
                label="Gender"
                value={signupForm.gender}
                onChangeText={(gender) => setSignupForm((prev) => ({ ...prev, gender }))}
              />
              <TextField
                label="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={signupForm.email}
                onChangeText={(email) => setSignupForm((prev) => ({ ...prev, email }))}
              />
              <TextField
                label="Password"
                secureTextEntry
                value={signupForm.password}
                onChangeText={(password) => setSignupForm((prev) => ({ ...prev, password }))}
              />
              <Button
                title={auth.status === "loading" ? "Creating account..." : "Create account"}
                onPress={handleSignup}
                fullWidth
              />
            </View>
          )}
        </CardContent>
        <Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />
      </Card>
    </ScrollView>
  )
}
