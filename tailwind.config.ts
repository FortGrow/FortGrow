import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // FortGrow design tokens — dark premium
        ink: {
          950: "#07090d",
          900: "#0b0e14",
          850: "#10141c",
          800: "#141926",
          700: "#1c2333",
          600: "#273046",
          500: "#39435e",
        },
        line: {
          DEFAULT: "rgba(148,163,184,0.12)",
          strong: "rgba(148,163,184,0.24)",
        },
        brand: {
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        grow: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        warn: "#f59e0b",
        danger: "#f43f5e",
        violet: "#8b5cf6",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56,189,248,0.25), 0 8px 32px -8px rgba(56,189,248,0.25)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
