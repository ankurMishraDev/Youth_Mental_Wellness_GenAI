import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Appearance } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { NativeWindStyleSheet } from "nativewind"

type ThemeScheme = "light" | "dark"

type ThemeContextValue = {
  scheme: ThemeScheme
  toggleTheme: () => void
  setScheme: (scheme: ThemeScheme) => void
}

const STORAGE_KEY = "@curez_theme"

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const resolveInitialScheme = async (): Promise<ThemeScheme> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") {
      return stored
    }
  } catch (error) {
    console.warn("Failed to load theme preference", error)
  }
  const system = Appearance.getColorScheme()
  return system === "dark" ? "dark" : "light"
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [scheme, setSchemeState] = useState<ThemeScheme>("light")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    resolveInitialScheme().then((value) => {
      setSchemeState(value)
      NativeWindStyleSheet.setColorScheme(value)
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!colorScheme) return
      setTheme(colorScheme === "dark" ? "dark" : "light")
    })
    return () => subscription.remove()
  }, [hydrated])

  const setTheme = (value: ThemeScheme) => {
    setSchemeState(value)
    NativeWindStyleSheet.setColorScheme(value)
    AsyncStorage.setItem(STORAGE_KEY, value).catch((error) =>
      console.warn("Failed to persist theme preference", error)
    )
  }

  const toggleTheme = () => {
    setTheme(scheme === "light" ? "dark" : "light")
  }

  const value = useMemo(
    () => ({
      scheme,
      toggleTheme,
      setScheme: setTheme,
    }),
    [scheme]
  )

  if (!hydrated) {
    return null
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
