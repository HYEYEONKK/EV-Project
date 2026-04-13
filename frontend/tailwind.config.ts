import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pwc: {
          orange: "#D04A02",
          "orange-light": "#FD5108",
          "orange-pale": "#FFF3ED",
        },
        sidebar: "#1A1A2E",
        "sidebar-hover": "#16213E",
        "sidebar-text": "#E8E8F0",
        surface: "#F7F8FC",
        "surface-card": "#FFFFFF",
        border: "#E5E7EB",
        "text-primary": "#111827",
        "text-secondary": "#6B7280",
        positive: "#059669",
        negative: "#DC2626",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px 0 rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
