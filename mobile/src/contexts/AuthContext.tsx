import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AuthFormState,
  AuthMode,
  SignupFormState,
  User,
  ViewType,
} from "../types";
import {
  getCurrentUser,
  login as loginRequest,
  signup as signupRequest,
  requestPasswordReset,
} from "../lib/auth";

export interface AuthContextValue {
  status: "loading" | "unauthenticated" | "authenticated";
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  currentUser: User | null;
  loginForm: AuthFormState;
  setLoginForm: (form: AuthFormState) => void;
  signupForm: SignupFormState;
  setSignupForm: (form: SignupFormState) => void;
  handleLogin: () => Promise<void>;
  handleSignup: () => Promise<void>;
  handleLogout: () => Promise<void>;
  updateCurrentUser: (user: User) => Promise<void>;
  forgotPasswordMode: boolean;
  setForgotPasswordMode: (mode: boolean) => void;
  forgotPasswordEmail: string;
  setForgotPasswordEmail: (email: string) => void;
  isSendingResetEmail: boolean;
  resetEmailSentTo: string | null;
  handleRequestPasswordReset: () => Promise<void>;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  signupVerificationEmail: string | null;
  unverifiedLoginEmail: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = "curez_user";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "authenticated">(
    "loading"
  );
  const [currentView, setCurrentView] = useState<ViewType>("landing");
  const [authMode, setAuthModeState] = useState<AuthMode>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState<AuthFormState>({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    email: "",
    password: "",
    name: "",
    age: "",
    gender: "",
  });
  const [forgotPasswordMode, setForgotPasswordModeState] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSentTo, setResetEmailSentTo] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupVerificationEmail, setSignupVerificationEmail] = useState<string | null>(null);
  const [unverifiedLoginEmail, setUnverifiedLoginEmail] = useState<string | null>(null);

  const persistUser = useCallback(async (user: User | null) => {
    if (user) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const refreshUserProfile = useCallback(
    async (uid: string) => {
      try {
        const user = await getCurrentUser(uid);
        setCurrentUser(user);
        await persistUser(user);
      } catch (error) {
        console.warn("Failed to refresh user profile", error);
      }
    },
    [persistUser]
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          const user = JSON.parse(stored) as User;
          setCurrentUser(user);
          setCurrentView("dashboard");
          setStatus("authenticated");
          if (user.uid) {
            await refreshUserProfile(user.uid);
          }
        } else {
          setStatus("unauthenticated");
        }
      } catch (error) {
        console.warn("Failed to load stored user", error);
        setStatus("unauthenticated");
      }
    };

    bootstrap();
  }, [refreshUserProfile]);

  useEffect(() => {
    if (!forgotPasswordMode) {
      setForgotPasswordEmail("");
      setResetEmailSentTo(null);
      setIsSendingResetEmail(false);
    }
  }, [forgotPasswordMode]);

  useEffect(() => {
    setSignupVerificationEmail(null);
  }, [signupForm.email]);

  const setAuthMode = useCallback((mode: AuthMode) => {
    setAuthModeState(mode);
    if (mode === "login") {
      setForgotPasswordModeState(false);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    if (!loginForm.email || !loginForm.password) {
      Alert.alert("Missing information", "Please enter your email and password.");
      return;
    }

    try {
      setIsLoggingIn(true);
      const user = await loginRequest(loginForm.email.trim(), loginForm.password);
      setCurrentUser(user);
      await persistUser(user);
      setCurrentView("dashboard");
      setStatus("authenticated");
      setUnverifiedLoginEmail(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      if ((error as Error & { code?: string }).code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedLoginEmail(loginForm.email.trim());
      }
      Alert.alert("Login failed", message);
    } finally {
      setIsLoggingIn(false);
    }
  }, [loginForm, persistUser]);

  const handleSignup = useCallback(async () => {
    if (
      !signupForm.email ||
      !signupForm.password ||
      !signupForm.name ||
      !signupForm.age ||
      !signupForm.gender
    ) {
      Alert.alert("Missing information", "Please complete all required fields.");
      return;
    }

    try {
      setIsSigningUp(true);
      const result = await signupRequest(signupForm);
      setSignupVerificationEmail(result.email);
      Alert.alert(
        "Verify your email",
        "We sent a verification link to your inbox. Please verify before logging in."
      );
      setAuthMode("login");
      setForgotPasswordModeState(false);
      setLoginForm({ email: result.email, password: "" });
      setSignupForm({ email: "", password: "", name: "", age: "", gender: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      Alert.alert("Signup failed", message);
    } finally {
      setIsSigningUp(false);
    }
  }, [setAuthMode, signupForm]);

  const handleLogout = useCallback(async () => {
    setCurrentUser(null);
    await persistUser(null);
    setCurrentView("auth");
    setStatus("unauthenticated");
  }, [persistUser]);

  const updateCurrentUser = useCallback(
    async (user: User) => {
      setCurrentUser(user);
      await persistUser(user);
    },
    [persistUser]
  );

  const setForgotPasswordMode = useCallback(
    (mode: boolean) => {
      setForgotPasswordModeState(mode);
      if (mode) {
        setForgotPasswordEmail(loginForm.email);
      }
    },
    [loginForm.email]
  );

  const handleReset = useCallback(async () => {
    if (!forgotPasswordEmail) {
      Alert.alert("Missing email", "Enter your email to receive a reset link.");
      return;
    }

    try {
      setIsSendingResetEmail(true);
      await requestPasswordReset(forgotPasswordEmail.trim());
      setResetEmailSentTo(forgotPasswordEmail.trim());
      Alert.alert(
        "Reset email sent",
        "Check your inbox for instructions to reset your password."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      Alert.alert("Unable to send reset email", message);
    } finally {
      setIsSendingResetEmail(false);
    }
  }, [forgotPasswordEmail]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      currentView,
      setCurrentView,
      authMode,
      setAuthMode,
      currentUser,
      loginForm,
      setLoginForm,
      signupForm,
      setSignupForm,
      handleLogin,
      handleSignup,
      handleLogout,
      updateCurrentUser,
      forgotPasswordMode,
      setForgotPasswordMode,
      forgotPasswordEmail,
      setForgotPasswordEmail,
      isSendingResetEmail,
      resetEmailSentTo,
      handleRequestPasswordReset: handleReset,
      isLoggingIn,
      isSigningUp,
      signupVerificationEmail,
      unverifiedLoginEmail,
    }),
    [
      authMode,
      currentUser,
      currentView,
      forgotPasswordEmail,
      forgotPasswordMode,
      handleLogin,
      handleLogout,
      handleReset,
      handleSignup,
      isLoggingIn,
      isSendingResetEmail,
      isSigningUp,
      loginForm,
      resetEmailSentTo,
      setAuthMode,
      signupForm,
      signupVerificationEmail,
      status,
      unverifiedLoginEmail,
      updateCurrentUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
