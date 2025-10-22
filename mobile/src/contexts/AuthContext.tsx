import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AuthUser, getCurrentUser } from "@/services/auth"

type AuthContextType = {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("curez_user")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser
          const freshUser = await getCurrentUser(parsedUser.uid)
          setUser(freshUser ? { ...parsedUser, ...freshUser } : parsedUser)
        }
      } catch (error) {
        console.error("Failed to load user from storage:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleSetUser = async (newUser: AuthUser | null) => {
    setUser(newUser)
    if (newUser) {
      await AsyncStorage.setItem("curez_user", JSON.stringify(newUser))
    } else {
      await AsyncStorage.removeItem("curez_user")
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
