import { useState, useEffect } from "react"
import { User, AuthMode } from "../lib/types"
import {
  login,
  signup,
  logout,
  requestPasswordReset,
  getCurrentUser,
} from "../lib/auth"
import type { SignupResult } from "../lib/auth"
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

  // Initialize and validate user from localStorage
  useEffect(() => {
    const validateSession = async () => {
      const savedUser = localStorage.getItem("curez_user")
      
      if (!savedUser) {
        setIsValidatingSession(false)
        return
      }

      try {
        const user = JSON.parse(savedUser) as User
        
        // Validate the session by fetching current user data
        try {
          const userData = await getCurrentUser(user.uid)
          
          // Session is valid, update user data
          const validatedUser = {
            uid: user.uid,
            email: userData.email || user.email,
            name: userData.name || "",
            age: userData.age,
            gender: userData.gender || "",
          }
          
          setCurrentUser(validatedUser)
          localStorage.setItem("curez_user", JSON.stringify(validatedUser))
          
          // Store userId for journal feature
          if (validatedUser.uid) {
            localStorage.setItem("userId", validatedUser.uid)
          }
        } catch (error) {
          // Session is invalid, clear it
          console.error("Invalid session, clearing user data:", error)
          localStorage.removeItem("curez_user")
          localStorage.removeItem("userId")
          setCurrentUser(null)
        }
      } catch (error) {
        console.error("Error parsing saved user:", error)
        localStorage.removeItem("curez_user")
        localStorage.removeItem("userId")
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
      const userData = await getCurrentUser(uid)
      const updatedUser = {
        uid,
        email: userData.email || currentUser?.email || "",
        name: userData.name || "",
        age: userData.age,
        gender: userData.gender || "",
      }

      setCurrentUser(updatedUser)
      localStorage.setItem("curez_user", JSON.stringify(updatedUser))
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
      setCurrentUser(user)
      setUnverifiedLoginEmail(null)
      // Store userId for journal feature
      localStorage.setItem("userId", user.uid)
      
      // Navigate to dashboard after successful login
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred"
      if ((error as Error & { code?: string }).code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedLoginEmail(loginForm.email)
      }
      alert(message)
    } finally {
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

  const handleLogout = () => {
    logout()
    setCurrentUser(null)
    // Clear userId for journal feature
    localStorage.removeItem("userId")
    
    // Navigate to landing page
    router.push('/')
  }

  const updateCurrentUser = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem("curez_user", JSON.stringify(user))
    // Update userId for journal feature
    if (user.uid) {
      localStorage.setItem("userId", user.uid)
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