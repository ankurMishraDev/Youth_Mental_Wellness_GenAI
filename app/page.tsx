"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Landing from "./Landing"

export default function HomePage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated via secure cookie
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })
        
        if (response.ok) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error("Error checking auth:", error)
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
