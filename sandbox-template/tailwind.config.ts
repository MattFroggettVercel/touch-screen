import type { Config } from "tailwindcss";

/*
 * Device physical specs:
 *   84 × 84 mm  •  720 × 720 px  •  ~254 PPI
 *   1 mm ≈ 10 px   •   DPR = 1 (CSS px = device px)
 *
 * All "device-*" tokens encode real-world physical sizes so every
 * component can reference them instead of scattering magic numbers.
 */

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /* ── Colour palette (unchanged) ─────────────────────────── */
      colors: {
        surface: {
          DEFAULT: "#1a1a2e",
          light: "#222240",
          lighter: "#2a2a4a",
        },
        accent: {
          DEFAULT: "#c9a962",
          dim: "#a08840",
        },
      },

      /* ── Device-aware spacing ───────────────────────────────── */
      spacing: {
        /* Touch targets  (10 mm min / 12 mm comfortable) */
        "touch-min": "100px",
        "touch": "120px",

        /* Slider geometry */
        "slider-thumb": "100px",
        "slider-track": "32px",

        /* Toggle switch */
        "toggle-w": "200px",
        "toggle-h": "100px",
        "toggle-thumb": "80px",

        /* Card internals */
        "card-px": "24px",
        "card-py": "20px",
        "card-gap": "16px",
      },

      /* ── Device-aware font sizes ────────────────────────────── */
      fontSize: {
        "device-xs":   ["24px", { lineHeight: "32px" }],
        "device-sm":   ["28px", { lineHeight: "36px" }],
        "device-base": ["32px", { lineHeight: "40px" }],
        "device-lg":   ["40px", { lineHeight: "48px" }],
        "device-xl":   ["56px", { lineHeight: "64px" }],
        "device-hero": ["80px", { lineHeight: "88px" }],
      },

      /* ── Device-aware border radius ─────────────────────────── */
      borderRadius: {
        "card": "24px",
        "btn":  "16px",
      },

      /* ── Fixed viewport ─────────────────────────────────────── */
      width: {
        "screen-device": "720px",
      },
      height: {
        "screen-device": "720px",
      },
    },
  },
  plugins: [],
} satisfies Config;
