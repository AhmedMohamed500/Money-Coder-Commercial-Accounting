import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08204b",
        ocean: "#0575e6",
        teal: "#09c7a2",
        mist: "#f2f8fc"
      },
      boxShadow: { soft: "0 18px 60px rgba(8, 32, 75, 0.09)" }
    }
  },
  plugins: []
} satisfies Config;
