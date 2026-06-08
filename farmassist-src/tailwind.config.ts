import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f3f7ef",
          100: "#e4edda",
          200: "#cbdcbc",
          300: "#aac68e",
          400: "#8caf6a",
          500: "#6f944e",
          600: "#56763b",
          700: "#445d31",
          800: "#384b2b",
          900: "#304027"
        },
        soil: "#735c3f",
        marigold: "#d99b28",
        water: "#427f9e"
      },
      boxShadow: {
        field: "0 18px 48px rgba(36, 56, 29, 0.14)"
      }
    }
  },
  plugins: []
} satisfies Config;
