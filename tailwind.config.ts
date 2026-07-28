import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--mono)", "ui-monospace", "monospace"],
        // Alias kept so existing `font-serif` markup keeps working. Nothing in
        // the project is serif any more — it resolves to the display sans.
        serif: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-sunken": "var(--bg-sunken)",
        warm: "var(--warm)",
        ink: {
          900: "var(--ink-900)",
          700: "var(--ink-700)",
          500: "var(--ink-500)",
          400: "var(--ink-400)",
          300: "var(--ink-300)",
          200: "var(--ink-200)",
          100: "var(--ink-100)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          ink: "var(--accent-ink)",
          soft: "var(--accent-soft)",
        },
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        fuel: {
          petrol: "#eab308",
          diesel: "#1e293b",
        },
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15,23,42,0.04)",
        md: "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.04)",
        lg: "0 4px 12px rgba(15,23,42,0.08), 0 24px 48px rgba(15,23,42,0.08)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      transitionTimingFunction: {
        ease: "cubic-bezier(0.2, 0.6, 0.2, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
