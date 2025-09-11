import { useState, useEffect } from "react"
import { User, ViewType, AuthMode } from "../lib/types"
import { login, signup, logout } from "../lib/auth"

export const useAuth = () => {
  const [currentView, setCurrentView] = useState<ViewType>("auth")
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    name: "",
    age: "",
    gender: "",
  })

  useEffect(() => {
    const savedUser = localStorage.getItem("youthguide_user")
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setCurrentView("dashboard")
      } catch (error) {
        console.error("Error parsing saved user:", error)
        localStorage.removeItem("youthguide_user")
      }
    }
  }, [])

  const handleLogin = async () => {
    try {
      const user = await login(loginForm.email, loginForm.password)
      setCurrentUser(user)
      setCurrentView("dashboard")
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred")
    }
  }

  const handleSignup = async () => {
    try {
      const user = await signup(signupForm)
      setCurrentUser(user)
      setCurrentView("dashboard")
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred")
    }
  }

  const handleLogout = () => {
    logout()
    setCurrentUser(null)
    setCurrentView("auth")
    // Note: audioClient close will be handled in session hook
  }

  return {
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
  }
}