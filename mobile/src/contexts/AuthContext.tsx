import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  AuthUser,
  SignupForm,
  getCurrentUser,
  login as loginRequest,
  signup as signupRequest,
  requestPasswordReset,
  updateProfile,
} from "@/services/auth"

export type AuthStatus = "idle" | "loading" | "authenticated" | "error"

type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  signup: (form: SignupForm) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updateUserProfile: (profile: Partial<AuthUser>) => Promise<void>
  errorMessage?: string | null
}

const STORAGE_KEY = "@curez_current_user"

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as AuthUser
          setUser(parsed)
          setStatus("authenticated")
          const fresh = await getCurrentUser(parsed.uid)
          if (fresh) {
            const merged = { ...parsed, ...fresh }
            setUser(merged)
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          }
        } else {
          setStatus("idle")
        }
      } catch (error) {
        console.warn("Failed to restore stored user", error)
        setStatus("idle")
      }
    }
    loadUser()
  }, [])

  const persistUser = useCallback(async (value: AuthUser | null) => {
    setUser(value)
    if (value) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setStatus("loading")
      setErrorMessage(null)
      try {
        const authenticated = await loginRequest(email, password)
        await persistUser(authenticated)
        setStatus("authenticated")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to login"
        setErrorMessage(message)
        setStatus("error")
        throw error
      }
    },
    [persistUser]
  )

  const signup = useCallback(async (form: SignupForm) => {
    setStatus("loading")
    setErrorMessage(null)
    try {
      await signupRequest(form)
      setStatus("idle")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign up"
      setErrorMessage(message)
      setStatus("error")
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    setStatus("idle")
    setErrorMessage(null)
    await persistUser(null)
  }, [persistUser])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const profile = await getCurrentUser(user.uid)
    if (profile) {
      const merged = { ...user, ...profile }
      await persistUser(merged)
    }
  }, [persistUser, user])

  const sendPasswordReset = useCallback(async (email: string) => {
    await requestPasswordReset(email)
  }, [])

  const updateUserProfile = useCallback(
    async (profile: Partial<AuthUser>) => {
      if (!user) return
      const updated = await updateProfile({ ...profile, uid: user.uid })
      await persistUser({ ...user, ...updated })
    },
    [persistUser, user]
  )

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      signup,
      logout,
      refreshProfile,
      sendPasswordReset,
      updateUserProfile,
      errorMessage,
    }),
    [user, status, login, signup, logout, refreshProfile, sendPasswordReset, updateUserProfile, errorMessage]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
