/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: "#FFF5F0",
          100: "#FFE8DC",
          200: "#FFD0B8",
          300: "#FFB08A",
          400: "#FF8B5A",
          500: "#FF6B35",
          600: "#F2521C",
          700: "#D94410",
          800: "#B3370A",
          900: "#8C2A06",
        },
        dark: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#2C3E50",
          900: "#1E293B",
        },
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
      },
      transitionTimingFunction: {
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
