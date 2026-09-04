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
        /* Surfaces — the Figma is a pure-black canvas with flat grey cards,
           no gradients. 800 is the standard card, 700 the raised card
           (journey/how-it-works), 600 the inset control (inputs, sliders). */
        ink: {
          950: "#000000",
          900: "#0A0A0A",
          850: "#141414",
          800: "#1D1D1D",
          700: "#2A2A2A",
          600: "#3E3E3E",
          500: "#565656",
        },
        /* Terracotta — the single brand accent, sampled from the Figma CTA fill. */
        accent: {
          DEFAULT: "#B75A44",
          soft: "#C87862",
          deep: "#8E4433",
          tint: "#E8CCC4",
        },
        /* Cyan — used only for the selected specialty filter. */
        spark: "#00C0E8",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "ui-serif", "Georgia", "serif"],
        /* Heavy condensed display — "Become Legendary", "ELITE COMMUNITY",
           the Access/Knowledge/Breakthrough words and their ghost layer. */
        display: ["var(--font-anton)", "Impact", "ui-sans-serif", "sans-serif"],
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
        scrollX: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /* The FAQ answer arriving in its card. Opacity only: the card's own
           grow is a view transition, and a second scale would fight it. */
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        /* The answer card arriving over the grid — it overshoots a little past
           its resting size so it reads as springing forward, not sliding in. */
        popIn: {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.93)" },
          "62%": { opacity: "1", transform: "translateY(-5px) scale(1.015)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        /* Each line inside the card following the one above it. */
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /* The terracotta bloom behind the card, widening as it lands. The
           translate is carried through both frames because the glow is also
           centred with a transform. */
        glowIn: {
          "0%": { opacity: "0", transform: "translateX(-50%) scale(0.45)" },
          "100%": { opacity: "1", transform: "translateX(-50%) scale(1)" },
        },
      },
      animation: {
        scrollY: "scrollY 120s linear infinite",
        scrollYReverse: "scrollYReverse 140s linear infinite",
        scrollX: "scrollX 40s linear infinite",
        fadeUp: "fadeUp 0.6s ease-out both",
        fadeIn: "fadeIn 240ms ease-out both",
        popIn: "popIn 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        riseIn: "riseIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both",
        glowIn: "glowIn 900ms ease-out both",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(ellipse at center, rgba(183,90,68,0.20) 0%, rgba(0,0,0,0) 60%)",
        "vignette-y":
          "linear-gradient(to bottom, #000000 0%, transparent 14%, transparent 86%, #000000 100%)",
        /* Hero portrait strip → black, so the headline sits on solid ground. */
        "hero-fade":
          "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 42%, rgba(0,0,0,0.75) 72%, #000000 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
