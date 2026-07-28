import type { Config } from "tailwindcss";

/**
 * BuildVision design system.
 *
 * Brand colors are declared as hex literals (not CSS vars) so Tailwind's
 * alpha modifiers (`bg-accent/20`, `border-ai/25`, …) work everywhere.
 * globals.css mirrors the same values as CSS custom properties for the
 * handful of handwritten component classes.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "390px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
    },
    extend: {
      colors: {
        /* ── Surfaces ─────────────────────────────────────────── */
        canvas: { DEFAULT: "#f8fafc", subtle: "#f1f5f9" },
        "canvas-subtle": "#f1f5f9",
        surface: {
          DEFAULT: "#f1f5f9",
          hover: "#e2e8f0",
          sunken: "#e2e8f0",
        },
        "surface-hover": "#e2e8f0",
        border: { DEFAULT: "#e2e8f0", strong: "#cbd5e1" },

        /* ── Dark surfaces (hero, footer, planner, sidebar) ───── */
        ink: {
          DEFAULT: "#020617",
          soft: "#0f172a",
          muted: "#1e293b",
          border: "rgba(255,255,255,0.08)",
        },

        /* ── Text ─────────────────────────────────────────────── */
        text: {
          primary: "#0f172a",
          secondary: "#475569",
          tertiary: "#64748b",
          inverted: "#ffffff",
        },

        /* ── Brand ────────────────────────────────────────────── */
        accent: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
          active: "#1e40af",
          soft: "#eff6ff",
          border: "#bfdbfe",
          fg: "#ffffff",
        },
        /* Engineering cyan — measurements, structure, data */
        cyan: { DEFAULT: "#06b6d4", soft: "#ecfeff" },
        /* AI purple — anything generated or assisted */
        ai: { DEFAULT: "#7c3aed", soft: "#f5f3ff" },

        /* ── Semantic ─────────────────────────────────────────── */
        success: { DEFAULT: "#10b981", soft: "#ecfdf5" },
        warning: { DEFAULT: "#f59e0b", soft: "#fffbeb" },
        danger: { DEFAULT: "#ef4444", soft: "#fef2f2" },

        /* Legacy aliases so older components keep compiling */
        background: "#f8fafc",
        foreground: "#0f172a",
        primary: { DEFAULT: "#2563eb", foreground: "#ffffff", soft: "#eff6ff" },
      },

      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },

      /* Fluid type scale — hero 64–96px, section 48–56, card 24–30 */
      fontSize: {
        hero: [
          "clamp(3rem, 7vw, 6rem)",
          { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "600" },
        ],
        section: [
          "clamp(2.25rem, 4vw, 3.5rem)",
          { lineHeight: "1.06", letterSpacing: "-0.028em", fontWeight: "600" },
        ],
        card: [
          "clamp(1.375rem, 1.8vw, 1.875rem)",
          { lineHeight: "1.2", letterSpacing: "-0.018em", fontWeight: "600" },
        ],
        "body-lg": ["1.125rem", { lineHeight: "1.65" }],
        small: ["1rem", { lineHeight: "1.6" }],

        /* Legacy display tokens used across the app */
        "display-2xl": [
          "clamp(2.75rem, 6vw, 4.5rem)",
          { lineHeight: "1.02", letterSpacing: "-0.03em", fontWeight: "600" },
        ],
        "display-xl": [
          "clamp(2.25rem, 4.5vw, 3.25rem)",
          { lineHeight: "1.05", letterSpacing: "-0.025em", fontWeight: "600" },
        ],
        "display-lg": [
          "clamp(1.75rem, 3vw, 2.25rem)",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
      },

      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },

      boxShadow: {
        xs: "0 1px 2px rgba(15, 23, 42, 0.04)",
        sm: "0 2px 8px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)",
        md: "0 8px 24px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(15, 23, 42, 0.04)",
        lg: "0 20px 48px rgba(15, 23, 42, 0.10), 0 4px 12px rgba(15, 23, 42, 0.05)",
        xl: "0 32px 72px rgba(15, 23, 42, 0.14), 0 8px 20px rgba(15, 23, 42, 0.06)",
        glow: "0 0 0 1px rgba(37, 99, 235, 0.12), 0 12px 32px rgba(37, 99, 235, 0.18)",
        soft: "0 2px 8px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)",
        lift: "0 8px 24px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(15, 23, 42, 0.04)",
      },

      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        smooth: "cubic-bezier(0.65, 0, 0.35, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        DEFAULT: "160ms",
        base: "280ms",
        slow: "520ms",
      },

      maxWidth: {
        tablet: "834px",
        content: "80rem",
        wide: "88rem",
        prose: "68ch",
      },

      spacing: {
        header: "4rem",
        sidebar: "15.5rem",
        "sidebar-sm": "4.5rem",
        "safe-b": "env(safe-area-inset-bottom, 0px)",
        section: "clamp(5rem, 10vw, 8.5rem)",
      },

      backgroundImage: {
        "grid-light":
          "linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)",
        "grid-dark":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },

      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { opacity: "0" },
        },
        "grid-pan": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "56px 56px" },
        },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        "fade-up": "fade-up 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 7s ease-in-out infinite",
        "float-slow": "float 11s ease-in-out infinite",
        scan: "scan 2.8s ease-in-out infinite",
        marquee: "marquee 44s linear infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        "grid-pan": "grid-pan 3.2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
