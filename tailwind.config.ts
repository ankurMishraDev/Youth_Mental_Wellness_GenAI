import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"], // Enable class-based dark mode
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map CSS variables to Tailwind colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // Card colors
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        
        // Popover colors
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        
        // Primary colors
        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dark)",
          light: "var(--primary-light)",
          foreground: "var(--primary-foreground)",
        },
        
        // Secondary colors
        secondary: {
          DEFAULT: "var(--secondary)",
          dark: "var(--secondary-dark)",
          light: "var(--secondary-light)",
          foreground: "var(--secondary-foreground)",
        },
        
        // Accent colors
        accent: {
          DEFAULT: "var(--accent)",
          dark: "var(--accent-dark)",
          light: "var(--accent-light)",
          foreground: "var(--accent-foreground)",
        },
        
        // Muted colors
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        
        // Destructive colors
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        
        // Border, input, ring
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        
        // Chart colors
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        
        // Sidebar colors
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        
        // Mood colors for journal
        mood: {
          happy: "var(--mood-happy)",
          sad: "var(--mood-sad)",
          anxious: "var(--mood-anxious)",
          calm: "var(--mood-calm)",
          excited: "var(--mood-excited)",
          angry: "var(--mood-angry)",
          neutral: "var(--mood-neutral)",
        },
      },
      
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      spacing: {
        "section": "var(--spacing-section)",
        "card": "var(--spacing-card)",
        "element": "var(--spacing-element)",
      },
      
      fontSize: {
        "display": ["var(--font-size-display)", { lineHeight: "1.1" }],
        "heading-1": ["var(--font-size-heading-1)", { lineHeight: "1.2" }],
        "heading-2": ["var(--font-size-heading-2)", { lineHeight: "1.3" }],
        "heading-3": ["var(--font-size-heading-3)", { lineHeight: "1.4" }],
        "body": ["var(--font-size-body)", { lineHeight: "1.6" }],
        "small": ["var(--font-size-small)", { lineHeight: "1.5" }],
      },
      
      fontWeight: {
        "light": "var(--font-weight-light)",
        "normal": "var(--font-weight-normal)",
        "medium": "var(--font-weight-medium)",
        "semibold": "var(--font-weight-semibold)",
        "bold": "var(--font-weight-bold)",
      },
      
      animation: {
        "fade-in": "fadeIn var(--animation-duration-slow) var(--animation-easing-default)",
        "slide-up": "slideUp var(--animation-duration-normal) var(--animation-easing-bounce)",
        "slide-down": "slideDown var(--animation-duration-normal) var(--animation-easing-bounce)",
        "scale-in": "scaleIn var(--animation-duration-fast) var(--animation-easing-default)",
        "pulse-slow": "pulse var(--animation-duration-slow) ease-in-out infinite",
      },
      
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      
      boxShadow: {
        "glass": "var(--shadow-glass)",
        "card": "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
      
      backdropBlur: {
        "glass": "var(--blur-glass)",
      },
      
      screens: {
        "xs": "475px",
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Add custom utilities plugin
    function({ addUtilities }: any) {
      addUtilities({
        '.glass': {
          'background': 'var(--glass-background)',
          'backdrop-filter': 'var(--glass-backdrop)',
          'border': '1px solid var(--glass-border)',
        },
        '.glass-strong': {
          'background': 'var(--glass-background-strong)',
          'backdrop-filter': 'var(--glass-backdrop)',
          'border': '1px solid var(--glass-border)',
        },
      })
    },
  ],
};

export default config;
