/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'ocean-dark': '#0a1628',
        'ocean-foam': '#e8f4f8',
        'ocean-accent': '#f59e0b',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      zIndex: {
        '45': '45',
      },
    },
  },
  plugins: [],
};
