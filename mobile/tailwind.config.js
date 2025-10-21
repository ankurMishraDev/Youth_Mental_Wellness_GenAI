const colors = {
  brand: {
    DEFAULT: "#6366F1",
    foreground: "#F8FAFC",
    dark: "#4F46E5",
    "dark-foreground": "#E0E7FF",
  },
  accent: {
    DEFAULT: "#14B8A6",
    muted: "#99F6E4",
    dark: "#0F766E",
  },
  surface: {
    DEFAULT: "#FFFFFF",
    muted: "#F1F5F9",
    strong: "#E2E8F0",
    foreground: "#0F172A",
    dark: "#0B1120",
    "dark-muted": "#111827",
    "dark-strong": "#1F2937",
    "dark-foreground": "#E2E8F0",
  },
  feedback: {
    success: "#22C55E",
    caution: "#F59E0B",
    danger: "#EF4444",
  },
}

module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors,
      fontFamily: {
        heading: ["Poppins", "System"],
        body: ["Inter", "System"],
        display: ["Poppins", "System"],
      },
      fontWeight: {
        "brand-light": "300",
        "brand-normal": "400",
        "brand-medium": "500",
        "brand-semibold": "600",
        "brand-bold": "700",
      },
      borderRadius: {
        xl: "1.25rem",
      },
      boxShadow: {
        elevated: "0 20px 45px -20px rgba(79, 70, 229, 0.45)",
      },
    },
  },
  plugins: [],
}
