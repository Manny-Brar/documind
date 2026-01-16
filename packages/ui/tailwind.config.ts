import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /* ============================================
         NEOBRUTALISM COLOR SYSTEM
         ============================================ */
      colors: {
        // Shadcn/UI compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Neobrutalism brand colors
        neo: {
          primary: "hsl(var(--neo-primary))",
          "primary-dark": "hsl(var(--neo-primary-dark))",
          secondary: "hsl(var(--neo-secondary))",
          "secondary-dark": "hsl(var(--neo-secondary-dark))",
          success: "hsl(var(--neo-success))",
          warning: "hsl(var(--neo-warning))",
          error: "hsl(var(--neo-error))",
          info: "hsl(var(--neo-info))",
          black: "hsl(var(--neo-black))",
          white: "hsl(var(--neo-white))",
        },

        // Surface colors
        surface: {
          main: "hsl(var(--neo-surface-main))",
          yellow: "hsl(var(--neo-surface-yellow))",
          blue: "hsl(var(--neo-surface-blue))",
          pink: "hsl(var(--neo-surface-pink))",
          mint: "hsl(var(--neo-surface-mint))",
          lavender: "hsl(var(--neo-surface-lavender))",
        },

        // Sidebar
        sidebar: {
          DEFAULT: "hsl(var(--neo-sidebar-bg))",
          hover: "hsl(var(--neo-sidebar-hover))",
        },
      },

      /* ============================================
         TYPOGRAPHY
         ============================================ */
      fontFamily: {
        heading: ["Archivo Black", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      /* ============================================
         BORDER RADIUS - Minimal for brutalism
         ============================================ */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        none: "0px",
      },

      /* ============================================
         SHADOWS - Hard edges, no blur
         ============================================ */
      boxShadow: {
        neo: "var(--shadow-neo)",
        "neo-sm": "var(--shadow-neo-sm)",
        "neo-lg": "var(--shadow-neo-lg)",
        "neo-pressed": "var(--shadow-neo-pressed)",
        "neo-primary": "var(--shadow-neo-primary)",
        "neo-error": "var(--shadow-neo-error)",
      },

      /* ============================================
         TRANSITIONS - Mechanical, not organic
         ============================================ */
      transitionDuration: {
        fast: "100ms",
        normal: "150ms",
        slow: "200ms",
      },
      transitionTimingFunction: {
        neo: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      /* ============================================
         SPACING - Generous for brutalism
         ============================================ */
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        sidebar: "280px",
        "sidebar-collapsed": "64px",
      },

      /* ============================================
         ANIMATIONS
         ============================================ */
      keyframes: {
        "neo-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        "neo-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "neo-pulse": "neo-pulse 200ms ease-out",
        "neo-shake": "neo-shake 200ms ease-out",
        "slide-in-right": "slide-in-right 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-left": "slide-in-left 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        "count-up": "count-up 300ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
