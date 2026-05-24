import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./ui/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "surface-container-low": "#0e0e0e",
        "on-secondary-container": "#ffffff",
        "on-primary-container": "#ffffff",
        "surface-container-high": "#181818",
        "secondary-container": "rgba(141, 255, 47, 0.1)",
        "background": "#050505",
        "surface-variant": "#1a1a1a",
        "on-error": "#ffffff",
        "on-primary-fixed-variant": "#002fc9",
        "surface-bright": "#0a0a0a",
        "primary-fixed-dim": "#bac3ff",
        "on-tertiary-fixed-variant": "#773200",
        "on-secondary": "#050505",
        "on-primary-fixed": "#00105b",
        "tertiary-fixed": "#ffdbca",
        "on-error-container": "#93000a",
        "on-surface": "#f5f5f5",
        "on-secondary-fixed-variant": "#422db2",
        "surface": "#0a0a0a",
        "inverse-on-surface": "#f1effc",
        "inverse-primary": "#bac3ff",
        "tertiary-fixed-dim": "#ffb68f",
        "surface-container-highest": "#222222",
        "error": "#ba1a1a",
        "surface-tint": "#6BFF57",
        "surface-container": "#121212",
        "primary-container": "rgba(107, 255, 87, 0.15)",
        "on-tertiary-container": "#ffffff",
        "secondary-fixed-dim": "#c7bfff",
        "primary-fixed": "#dee0ff",
        "outline": "#2b2b2b",
        "on-tertiary": "#ffffff",
        "secondary": "#8DFF2F",
        "error-container": "#ffdad6",
        "tertiary": "#994200",
        "surface-dim": "#080808",
        "on-tertiary-fixed": "#331200",
        "on-primary": "#050505",
        "secondary-fixed": "#e4dfff",
        "on-background": "#f5f5f5",
        "on-secondary-fixed": "#170065",
        "inverse-surface": "#2f3039",
        "primary": "#6BFF57",
        "tertiary-container": "#bf5500",
        "surface-container-lowest": "#050505",
        "on-surface-variant": "#a1a1aa",
        "outline-variant": "#3a3a3a"
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem"
      },
      spacing: {
        "gutter": "12px",
        "xs": "8px",
        "container-margin": "20px",
        "xl": "48px",
        "md": "20px",
        "sm": "12px",
        "lg": "32px",
        "base": "4px"
      }
    },
  },
  plugins: [],
};

export default config;
