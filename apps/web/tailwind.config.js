const { palette } = require('../../packages/shared/src/constants/design-tokens.ts')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: palette,
    },
  },
  plugins: [],
}
