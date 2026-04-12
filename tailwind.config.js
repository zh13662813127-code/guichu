/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        paper: "#F7F3EC",
        "paper-dark": "#EFE9DD",
        ink: "#1F1B16",
        "ink-light": "#5E574E",
        "ink-mute": "#A39A8C",
        vermilion: "#B33A2A",
        "vermilion-pressed": "#8C2A1E",
        jade: "#3F7A5E",
        amber: "#C68A2E",
        crimson: "#8B1E1E",
        divider: "#D9D2C2",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        base: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        "2xl": "24px",
      },
    },
  },
  plugins: [],
};
