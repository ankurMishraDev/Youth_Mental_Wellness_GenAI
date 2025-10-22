import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../src/contexts/AuthContext";
import { GradientCard } from "../src/components/GradientCard";

const InputField = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
}) => (
  <View className="mb-4">
    <Text className="mb-2 font-[Inter_500Medium] text-sm text-muted">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#64748b"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      className="h-12 rounded-xl border border-white/10 bg-card px-4 font-[Inter_500Medium] text-foreground"
    />
  </View>
);

const AuthScreen = () => {
  const {
    authMode,
    setAuthMode,
    loginForm,
    setLoginForm,
    signupForm,
    setSignupForm,
    handleLogin,
    handleSignup,
    isLoggingIn,
    isSigningUp,
    forgotPasswordMode,
    setForgotPasswordMode,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    handleRequestPasswordReset,
    isSendingResetEmail,
    resetEmailSentTo,
    signupVerificationEmail,
    unverifiedLoginEmail,
  } = useAuth();

  const [passwordVisible, setPasswordVisible] = useState(false);

  const isLogin = authMode === "login";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-12">
            <Text className="font-[Ribeye_400Regular] text-4xl text-primary">CureZ</Text>
            <Text className="mt-3 font-[Inter_700Bold] text-3xl text-foreground">
              {isLogin ? "Welcome back" : "Create your CureZ account"}
            </Text>
            <Text className="mt-2 font-[Inter_400Regular] text-sm text-muted">
              {isLogin
                ? "Sign in to continue your personalized wellness journey."
                : "We just need a few details to tailor your AI mentor experience."}
            </Text>
          </View>

          <GradientCard>
            <View className="flex-row rounded-full bg-white/10 p-1">
              <Pressable
                onPress={() => setAuthMode("login")}
                className={`flex-1 items-center rounded-full px-4 py-2 ${
                  isLogin ? "bg-primary" : ""
                }`}
              >
                <Text
                  className={`font-[Inter_600SemiBold] text-sm ${
                    isLogin ? "text-white" : "text-muted"
                  }`}
                >
                  Sign in
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAuthMode("signup")}
                className={`flex-1 items-center rounded-full px-4 py-2 ${
                  !isLogin ? "bg-primary" : ""
                }`}
              >
                <Text
                  className={`font-[Inter_600SemiBold] text-sm ${
                    !isLogin ? "text-white" : "text-muted"
                  }`}
                >
                  Create account
                </Text>
              </Pressable>
            </View>

            {!forgotPasswordMode && (
              <View className="mt-6">
                <InputField
                  label="Email"
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  value={isLogin ? loginForm.email : signupForm.email}
                  onChangeText={(text) =>
                    isLogin
                      ? setLoginForm({ ...loginForm, email: text })
                      : setSignupForm({ ...signupForm, email: text })
                  }
                />
                <InputField
                  label="Password"
                  placeholder="At least 6 characters"
                  secureTextEntry={!passwordVisible}
                  value={isLogin ? loginForm.password : signupForm.password}
                  onChangeText={(text) =>
                    isLogin
                      ? setLoginForm({ ...loginForm, password: text })
                      : setSignupForm({ ...signupForm, password: text })
                  }
                />
                <Pressable
                  onPress={() => setPasswordVisible((prev) => !prev)}
                  className="mb-4 self-end"
                >
                  <Text className="font-[Inter_500Medium] text-xs text-muted">
                    {passwordVisible ? "Hide password" : "Show password"}
                  </Text>
                </Pressable>

                {!isLogin && (
                  <View>
                    <InputField
                      label="Name"
                      placeholder="Your full name"
                      value={signupForm.name}
                      onChangeText={(text) => setSignupForm({ ...signupForm, name: text })}
                    />
                    <InputField
                      label="Age"
                      placeholder="16"
                      keyboardType="numeric"
                      value={signupForm.age}
                      onChangeText={(text) => setSignupForm({ ...signupForm, age: text })}
                    />
                    <InputField
                      label="Gender"
                      placeholder="How do you identify?"
                      value={signupForm.gender}
                      onChangeText={(text) => setSignupForm({ ...signupForm, gender: text })}
                    />
                  </View>
                )}

                {isLogin && (
                  <Pressable
                    onPress={() => setForgotPasswordMode(true)}
                    className="mt-2 self-end"
                  >
                    <Text className="font-[Inter_500Medium] text-xs text-primary">
                      Forgot password?
                    </Text>
                  </Pressable>
                )}

                {signupVerificationEmail && (
                  <View className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-3">
                    <Text className="font-[Inter_500Medium] text-sm text-primary">
                      Verification email sent to {signupVerificationEmail}.
                    </Text>
                  </View>
                )}

                {unverifiedLoginEmail && (
                  <View className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3">
                    <Text className="font-[Inter_500Medium] text-sm text-warning-foreground">
                      Please verify {unverifiedLoginEmail} before signing in.
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={isLogin ? handleLogin : handleSignup}
                  className="mt-6 rounded-full bg-primary px-6 py-3"
                  disabled={isLogin ? isLoggingIn : isSigningUp}
                >
                  <View className="flex-row items-center justify-center gap-2">
                    {(isLogin ? isLoggingIn : isSigningUp) ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Feather name="arrow-right" size={20} color="#fff" />
                    )}
                    <Text className="font-[Inter_600SemiBold] text-base text-white">
                      {isLogin ? "Sign in" : "Create account"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {forgotPasswordMode && (
              <View className="mt-6">
                <InputField
                  label="Email"
                  placeholder="you@email.com"
                  value={forgotPasswordEmail}
                  onChangeText={setForgotPasswordEmail}
                  keyboardType="email-address"
                />
                {resetEmailSentTo && (
                  <View className="mb-4 rounded-xl border border-success/40 bg-success/10 p-3">
                    <Text className="font-[Inter_500Medium] text-sm text-success-foreground">
                      Password reset email sent to {resetEmailSentTo}.
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={handleRequestPasswordReset}
                  className="mt-2 rounded-full bg-primary px-6 py-3"
                  disabled={isSendingResetEmail}
                >
                  <View className="flex-row items-center justify-center gap-2">
                    {isSendingResetEmail ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Feather name="mail" size={20} color="#fff" />
                    )}
                    <Text className="font-[Inter_600SemiBold] text-base text-white">
                      Send reset link
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => setForgotPasswordMode(false)} className="mt-4 self-center">
                  <Text className="font-[Inter_500Medium] text-xs text-muted">
                    Back to sign in
                  </Text>
                </Pressable>
              </View>
            )}
          </GradientCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;
