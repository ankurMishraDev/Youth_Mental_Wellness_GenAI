"use client"

import { useEffect } from "react"
import { Auth } from "../components/Auth"
import { Dashboard } from "../components/Dashboard"
import { Session } from "../components/Session"
import { useAuth } from "../hooks/useAuth"
import { useMessages } from "../hooks/useMessages"
import { useSession } from "../hooks/useSession"

export default function YouthGuide() {
  const auth = useAuth()
  const { messages, setMessages, messagesEndRef } = useMessages()
  const session = useSession(auth.currentUser, setMessages)

  // Initialize audio client when session starts
  useEffect(() => {
    if (auth.currentView === "session" && !session.audioClientRef.current) {
      session.initializeAudioClient()
    }
  }, [auth.currentView, session])

  const handleLogout = () => {
    auth.handleLogout()
    if (session.audioClientRef.current) {
      session.audioClientRef.current.close()
    }
  }

  if (auth.currentView === "auth") {
    return (
      <Auth
        authMode={auth.authMode}
        setAuthMode={auth.setAuthMode}
        loginForm={auth.loginForm}
        setLoginForm={auth.setLoginForm}
        signupForm={auth.signupForm}
        setSignupForm={auth.setSignupForm}
        handleLogin={auth.handleLogin}
        handleSignup={auth.handleSignup}
      />
    )
  }

  if (auth.currentView === "dashboard") {
    return (
      <Dashboard
        currentUser={auth.currentUser}
        handleLogout={handleLogout}
        dashboardPage={session.dashboardPage}
        setDashboardPage={session.setDashboardPage}
        setCurrentView={auth.setCurrentView}
      />
    )
  }

  if (auth.currentView === "session") {
    return (
      <Session
        messages={messages}
        messagesEndRef={messagesEndRef}
        isRecording={session.isRecording}
        sessionSeconds={session.sessionSeconds}
        sessionActive={session.sessionActive}
        isAudioPlaying={session.isAudioPlaying}
        startRecording={session.startRecording}
        stopRecording={session.stopRecording}
        endSession={() => {
          session.endSession()
          auth.setCurrentView("dashboard")
        }}
        setCurrentView={auth.setCurrentView}
      />
    )
  }

  return null
}
