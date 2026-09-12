const { palette, fonts } = require('../../packages/shared/src/constants/design-tokens.ts')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: palette,
      fontFamily: { display: fonts.display },
    },
  },
  plugins: [],
}
