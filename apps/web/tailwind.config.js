const { palette, ink, fonts } = require('../../packages/shared/src/constants/design-tokens.ts')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/shared/src/ui/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy dark-only palette; pages still on it are swept to the
        // CSS-variable tokens below during the DESIGN.md rebuild.
        ...palette,
        slate: ink,
        // DESIGN.md dual-theme tokens, defined in globals.css.
        canvas: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)' },
        line: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
        content: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: { DEFAULT: 'var(--accent)', subtle: 'var(--accent-subtle)', ink: 'var(--on-accent)' },
      },
      // The six DESIGN.md type sizes.
      fontSize: {
        hero: ['40px', { lineHeight: '1.2', fontWeight: '700' }],
        title: ['20px', { lineHeight: '1.2', fontWeight: '600' }],
        stat: ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.6' }],
        label: ['13px', { lineHeight: '1.2', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '1.4' }],
      },
      fontFamily: { display: fonts.display },
      transitionTimingFunction: { silk: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
