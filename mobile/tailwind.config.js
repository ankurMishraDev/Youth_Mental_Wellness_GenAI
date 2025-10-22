const nativewind = require("nativewind/preset")
const designTokens = require("./tailwindconfig.json")

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        ...designTokens.colors,
        primary: designTokens.colors.primary,
        secondary: designTokens.colors.secondary,
        accent: designTokens.colors.accent,
        success: designTokens.colors.success,
        warning: designTokens.colors.warning,
        destructive: designTokens.colors.destructive,
      },
      fontFamily: designTokens.fontFamily,
      fontSize: designTokens.fontSize,
      spacing: designTokens.spacing,
      borderRadius: designTokens.radii,
      boxShadow: designTokens.shadows,
      opacity: designTokens.opacity,
    },
  },
  plugins: [],
}
