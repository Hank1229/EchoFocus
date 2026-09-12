import { palette, fonts } from '../../packages/shared/src/constants/design-tokens.ts'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      colors: palette,
      fontFamily: { display: fonts.display },
      width: {
        popup: '360px',
      },
    },
  },
  plugins: [],
}
