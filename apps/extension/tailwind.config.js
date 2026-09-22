import { palette, ink, fonts } from '../../packages/shared/src/constants/design-tokens.ts'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      // `slate` is remapped to the shared teal-cast ink scale — see the note
      // in packages/shared/src/constants/design-tokens.ts. Options and
      // onboarding still render on it; the popup is off it since Phase 1 of
      // the DESIGN.md rebuild and uses the CSS-variable tokens below instead.
      colors: {
        ...palette,
        slate: ink,
        // DESIGN.md dual-theme tokens. Defined in popup/index.css; the other
        // extension pages adopt them in Phase 2.
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
      // The six DESIGN.md type sizes — the popup uses these and nothing else.
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
      width: {
        popup: '380px',
      },
    },
  },
  plugins: [],
}
