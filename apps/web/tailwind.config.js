const { palette, ink, fonts } = require('../../packages/shared/src/constants/design-tokens.ts')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // `slate` is deliberately remapped to the teal-cast ink scale from the
      // shared tokens — every slate-* class in the app renders EchoFocus's
      // own neutrals, not Tailwind's blue-grey.
      colors: { ...palette, slate: ink },
      fontFamily: { display: fonts.display },
      transitionTimingFunction: { silk: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
