import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF7F2",
        surface: "#FFFFFF",
        ink: "#1E293B",
        muted: "#64748B",
        line: "#E8E2D9",
        primary: {
          DEFAULT: "#A9310F",
          soft: "#D9532F",
          wash: "#FDF0EA",
        },
        secondary: {
          DEFAULT: "#1B4D3E",
          soft: "#376757",
          wash: "#ECFDF5",
        },
        accepted: {
          DEFAULT: "#059669",
          wash: "#ECFDF5",
        },
        rejected: {
          DEFAULT: "#E11D48",
          wash: "#FFF1F2",
        },
        neutralwash: "#F1ECE4",
      },
      fontFamily: {
        display: [
          "Epilogue",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        sans: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 6px -1px rgba(30, 41, 59, 0.04), 0 1px 3px -1px rgba(30, 41, 59, 0.03)",
        cardHover:
          "0 8px 16px -2px rgba(30, 41, 59, 0.06), 0 3px 6px -2px rgba(30, 41, 59, 0.04)",
        sheet:
          "0 20px 25px -5px rgba(30, 41, 59, 0.08), 0 8px 10px -6px rgba(30, 41, 59, 0.03)",
        inset: "inset 0 1px 2px rgba(30, 41, 59, 0.03)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 220ms ease-out both",
        "fade-in": "fade-in 180ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
