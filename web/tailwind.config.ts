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
        "surface-container-low": "#f4f2ff",
        "on-secondary-container": "#fffbff",
        "on-primary-container": "#fffbff",
        "surface-container-high": "#e8e7f3",
        "secondary-container": "#7161e3",
        "background": "#fbf8ff",
        "surface-variant": "#e2e1ee",
        "on-error": "#ffffff",
        "on-primary-fixed-variant": "#002fc9",
        "surface-bright": "#fbf8ff",
        "primary-fixed-dim": "#bac3ff",
        "on-tertiary-fixed-variant": "#773200",
        "on-secondary": "#ffffff",
        "on-primary-fixed": "#00105b",
        "tertiary-fixed": "#ffdbca",
        "on-error-container": "#93000a",
        "on-surface": "#1a1b24",
        "on-secondary-fixed-variant": "#422db2",
        "surface": "#fbf8ff",
        "inverse-on-surface": "#f1effc",
        "inverse-primary": "#bac3ff",
        "tertiary-fixed-dim": "#ffb68f",
        "surface-container-highest": "#e2e1ee",
        "error": "#ba1a1a",
        "surface-tint": "#2d4ce2",
        "surface-container": "#eeecf9",
        "primary-container": "#4965f9",
        "on-tertiary-container": "#fffbff",
        "secondary-fixed-dim": "#c7bfff",
        "primary-fixed": "#dee0ff",
        "outline": "#757687",
        "on-tertiary": "#ffffff",
        "secondary": "#5846c8",
        "error-container": "#ffdad6",
        "tertiary": "#994200",
        "surface-dim": "#dad9e5",
        "on-tertiary-fixed": "#331200",
        "on-primary": "#ffffff",
        "secondary-fixed": "#e4dfff",
        "on-background": "#1a1b24",
        "on-secondary-fixed": "#170065",
        "inverse-surface": "#2f3039",
        "primary": "#2a49df",
        "tertiary-container": "#bf5500",
        "surface-container-lowest": "#ffffff",
        "on-surface-variant": "#444655",
        "outline-variant": "#c5c5d8"
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
