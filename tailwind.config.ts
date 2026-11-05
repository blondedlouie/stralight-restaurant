import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      padding: {
        safe: "max(1rem, env(safe-area-inset-bottom))",
        "safe-x": "env(safe-area-inset-left)",
      },
      spacing: {
        "safe-bottom": "max(1rem, env(safe-area-inset-bottom))",
      },
      backdropBlur: {
        xs: "2px",
        glass: "24px",
      },
      opacity: {
        92: "0.92",
        72: "0.72",
      },
      colors: {
        brand: {
          bg: "#FFFFFF",
          surface: "#FFFFFF",
          card: "#FFFFFF",
          border: "#E7E3EF",
          primary: "#FFC700",
          primaryHover: "#F0B800",
          accent: "#2D0B5A",
          purple: "#2D0B5A",
          ink: "#2D0B5A",
          textMuted: "#6B6480"
        }
      }
    },
  },
  plugins: [],
};
export default config;
