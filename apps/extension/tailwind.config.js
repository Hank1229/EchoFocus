import { palette, ink, fonts } from '../../packages/shared/src/constants/design-tokens.ts'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      // `slate` is remapped to the shared teal-cast ink scale — see the note
      // in packages/shared/src/constants/design-tokens.ts.
      colors: { ...palette, slate: ink },
      fontFamily: { display: fonts.display },
      transitionTimingFunction: { silk: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      width: {
        popup: '360px',
      },
    },
  },
  plugins: [],
}
