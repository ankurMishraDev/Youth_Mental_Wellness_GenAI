"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Landing from "./Landing"
import { getCurrentUser } from "@/lib/auth"

export default function HomePage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = localStorage.getItem("curez_user")
      
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          if (user?.uid) {
            // Validate session before redirecting
            try {
              await getCurrentUser(user.uid)
              // Valid session, redirect to dashboard
              router.push('/dashboard')
              return
            } catch (error) {
              // Invalid session, clear it
              console.error("Invalid session on landing page:", error)
              localStorage.removeItem("curez_user")
              localStorage.removeItem("userId")
            }
          }
        } catch (error) {
          console.error("Error checking saved user:", error)
          localStorage.removeItem("curez_user")
          localStorage.removeItem("userId")
        }
      }
      
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  const handleBeginJourney = () => {
    router.push('/auth')
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return <Landing onBeginJourney={handleBeginJourney} />
}
