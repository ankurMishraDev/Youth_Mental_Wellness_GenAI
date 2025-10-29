import { useState, useEffect } from "react"
import { User, AuthMode } from "../lib/types"
import {
  login,
  signup,
  logout,
  requestPasswordReset,
  getCurrentUser,
} from "../lib/api/auth"
import type { SignupResult } from "../lib/api/auth"
import { useRouter } from "next/navigation"

export const useAuth = () => {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isValidatingSession, setIsValidatingSession] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    name: "",
    age: "",
    gender: "",
  })
  const [forgotPasswordModeState, setForgotPasswordMode] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false)
  const [resetEmailSentTo, setResetEmailSentTo] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [signupVerificationEmail, setSignupVerificationEmail] = useState<string | null>(null)
  const [unverifiedLoginEmail, setUnverifiedLoginEmail] = useState<string | null>(null)

  // Initialize and validate user from secure session
  useEffect(() => {
    const validateSession = async () => {
      try {
        const user = await getCurrentUser()
        
        if (user) {
          setCurrentUser(user)
        }
      } catch (error) {
        console.error("Session validation error:", error)
        setCurrentUser(null)
      } finally {
        setIsValidatingSession(false)
      }
    }

    validateSession()
  }, [])

  useEffect(() => {
    if (!forgotPasswordModeState) {
      setForgotPasswordEmail("")
      setResetEmailSentTo(null)
      setIsSendingResetEmail(false)
    }
  }, [forgotPasswordModeState])

  useEffect(() => {
    setSignupVerificationEmail(null)
  }, [signupForm.email])

  const refreshUserProfile = async (uid: string) => {
    try {
      const user = await getCurrentUser()
      if (user) {
        setCurrentUser(user)
      }
    } catch (error) {
      console.error("Failed to refresh user profile:", error)
    }
  }

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      alert("Please enter your email and password.")
      return
    }

    try {
      setIsLoggingIn(true)
      const user = await login(loginForm.email, loginForm.password)
      
      // Wait a bit to ensure cookie is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify session with retries
      let retries = 3;
      let userFetched = false;
      
      while (retries > 0 && !userFetched) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const checkResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.user) {
            setCurrentUser(checkData.user);
            userFetched = true;
            break;
          }
        }
        
        retries--;
      }
      
      if (!userFetched) {
        throw new Error('Failed to validate session. Please try again.');
      }
      
      setUnverifiedLoginEmail(null)
      
      // Force a hard navigation to clear any stale state
      window.location.href = '/dashboard';
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred"
      if ((error as Error & { code?: string }).code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedLoginEmail(loginForm.email)
      }
      alert(message)
      setIsLoggingIn(false)
    }
  }

  const handleSignup = async () => {
    if (!signupForm.email || !signupForm.password || !signupForm.name || !signupForm.age || !signupForm.gender) {
      alert("Please complete all required fields before signing up.")
      return
    }

    try {
      setIsSigningUp(true)
      const result: SignupResult = await signup(signupForm)
      setSignupVerificationEmail(result.email)
      alert("Verification email sent. Please check your inbox to verify your account before logging in.")
      setAuthMode("login")
      setForgotPasswordMode(false)
      setLoginForm({ email: result.email, password: "" })
      setSignupForm({ email: "", password: "", name: "", age: "", gender: "" })
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleRequestPasswordReset = async () => {
    if (!forgotPasswordEmail) {
      alert("Please enter your email to receive a password reset link.")
      return
    }

    try {
      setIsSendingResetEmail(true)
      await requestPasswordReset(forgotPasswordEmail)
      setResetEmailSentTo(forgotPasswordEmail)
      alert("Password reset email sent. Please check your inbox.")
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSendingResetEmail(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setCurrentUser(null)
      
      // Navigate to landing page
      router.push('/')
    } catch (error) {
      console.error("Logout error:", error)
      // Still clear local state and redirect even if API call fails
      setCurrentUser(null)
      router.push('/')
    }
  }

  const updateCurrentUser = async (updates: Partial<User>) => {
    try {
      const user = await getCurrentUser()
      if (user) {
        setCurrentUser({ ...user, ...updates })
      }
    } catch (error) {
      console.error("Failed to update user:", error)
    }
  }

  const setForgotPasswordModeState = (mode: boolean) => {
    setForgotPasswordMode(mode)
    if (mode) {
      setForgotPasswordEmail(loginForm.email)
    }
  }

  return {
    authMode,
    setAuthMode,
    currentUser,
    isValidatingSession,
    loginForm,
    setLoginForm,
    signupForm,
    setSignupForm,
    handleLogin,
    handleSignup,
    handleLogout,
    updateCurrentUser,
    refreshUserProfile,
    forgotPasswordMode: forgotPasswordModeState,
    setForgotPasswordMode: setForgotPasswordModeState,
    forgotPasswordEmail,
    setForgotPasswordEmail,
    isSendingResetEmail,
    resetEmailSentTo,
    handleRequestPasswordReset,
    isLoggingIn,
    isSigningUp,
    signupVerificationEmail,
    unverifiedLoginEmail,
  }
}