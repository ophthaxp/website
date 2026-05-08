import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#06070A",
          900: "#0A0B0F",
          850: "#0F1116",
          800: "#14171D",
          700: "#1B1F27",
          600: "#262B35",
          500: "#3A4150",
        },
        accent: {
          DEFAULT: "#7C5CFF",
          soft: "#A78BFA",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "ui-serif", "Georgia", "serif"],
      },
      keyframes: {
        scrollY: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        scrollYReverse: {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scrollY: "scrollY 120s linear infinite",
        scrollYReverse: "scrollYReverse 140s linear infinite",
        fadeUp: "fadeUp 0.6s ease-out both",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(ellipse at center, rgba(124,92,255,0.18) 0%, rgba(6,7,10,0) 60%)",
        "vignette-y":
          "linear-gradient(to bottom, #06070A 0%, transparent 14%, transparent 86%, #06070A 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
