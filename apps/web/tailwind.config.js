/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        productive: '#22c55e',
        distraction: '#ef4444',
        neutral: '#94a3b8',
      },
    },
  },
  plugins: [],
}
