const nativewind = require("nativewind/preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        surface: "#111827",
        card: "#1f2937",
        cardMuted: "#1e293b",
        overlay: "rgba(15, 23, 42, 0.65)",
        border: "#334155",
        muted: "#94a3b8",
        foreground: "#f8fafc",
        subtle: "#cbd5f5",
        primary: {
          DEFAULT: "#ea580c",
          foreground: "#fef2f2"
        },
        secondary: {
          DEFAULT: "#f97316",
          foreground: "#fff7ed"
        },
        accent: {
          DEFAULT: "#38bdf8",
          foreground: "#0f172a"
        },
        success: {
          DEFAULT: "#22c55e",
          foreground: "#022c22"
        },
        warning: {
          DEFAULT: "#facc15",
          foreground: "#422006"
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fef2f2"
        }
      },
      fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        "2xl": 24,
        "3xl": 32
      },
      spacing: {
        "2xs": 4,
        xs: 6,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        "2xl": 24,
        "3xl": 32
      },
      borderRadius: {
        sm: 8,
        md: 12,
        lg: 18,
        xl: 28,
        pill: 999
      },
      opacity: {
        glass: 0.75
      }
    },
  },
  plugins: [],
};
