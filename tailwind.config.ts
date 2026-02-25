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
        fuel: {
          petrol: "#eab308",
          diesel: "#1e293b",
          accent: "#0ea5e9",
        },
      },
    },
  },
  plugins: [],
};
export default config;
