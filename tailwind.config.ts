import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F8A4B",
          dark: "#0B6B3A",
          light: "#E7F5EC",
        },
        ink: "#1A1A1A",
        muted: "#6B7280",
        surface: "#F5F5F4",
      },
      fontFamily: {
        bangla: ["'Noto Sans Bengali'", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
