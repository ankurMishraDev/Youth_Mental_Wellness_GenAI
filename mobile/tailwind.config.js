/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#4b5563",
        card: "#fffbeb",
        primary: {
          DEFAULT: "#ea580c",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f97316",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f9fafb",
          foreground: "#4b5563",
        },
        accent: {
          DEFAULT: "#f97316",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        border: "#e5e7eb",
      },
      fontFamily: {
        sans: ["GeistSans"],
        mono: ["GeistMono"],
        heading: ["Ribeye"],
      },
    },
  },
  plugins: [],
};
