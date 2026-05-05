/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        samand_dark: '#0f1115',
        samand_accent: '#3b82f6',
      }
    },
  },
  plugins: [],
}