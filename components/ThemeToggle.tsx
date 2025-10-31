'use client'

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface ThemeToggleProps {
  className?: string
  variant?: 'default' | 'icon-only'
}

export function ThemeToggle({ className = "", variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center w-10 h-10 ${className}`}>
        <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
      </div>
    )
  }

  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  if (variant === 'icon-only') {
    return (
      <motion.button
        onClick={toggleTheme}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full 
          bg-background/50 backdrop-blur-sm border border-border
          hover:bg-muted transition-colors duration-300
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300 }}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <motion.div
          initial={false}
          animate={{
            rotate: isDark ? 180 : 0,
            scale: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute"
        >
          <Sun className="w-5 h-5 text-foreground" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            rotate: isDark ? 0 : -180,
            scale: isDark ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute"
        >
          <Moon className="w-5 h-5 text-foreground" />
        </motion.div>
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full 
        bg-background/50 backdrop-blur-sm border border-border
        hover:bg-muted transition-colors duration-300
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.div
        initial={false}
        animate={{
          x: isDark ? 20 : 0,
          opacity: isDark ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
        className="absolute left-4"
      >
        <Sun className="w-5 h-5 text-foreground" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          x: isDark ? 0 : -20,
          opacity: isDark ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute left-4"
      >
        <Moon className="w-5 h-5 text-foreground" />
      </motion.div>
      <span className="ml-6 text-sm font-medium text-foreground">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </motion.button>
  )
}
