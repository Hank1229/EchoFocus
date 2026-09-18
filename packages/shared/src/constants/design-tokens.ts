import type { Category } from '../types'

// Dark-only palette (2026-09 renovation). Teal is the sole brand/interactive
// color; emerald is reserved for productive time, orange for Breaks & Browsing.
// Red never marks a category — rose exists only for error feedback.
export const palette = {
  brand: { soft: '#5eead4', DEFAULT: '#2dd4bf', deep: '#14b8a6' },
  productive: { DEFAULT: '#34d399', deep: '#10b981' },
  breaks: { DEFAULT: '#fb923c', deep: '#f97316' },
  neutral: { DEFAULT: '#93a69d', deep: '#64766e' },
  danger: { DEFAULT: '#fb7185', deep: '#f43f5e' },
} as const

// The neutral scale. Not Tailwind's slate: every step carries a faint teal
// cast (hue ~165°) so the darks read as EchoFocus's own night rather than a
// stock blue-grey. Both apps map this over `slate` in their Tailwind config,
// which is what recolors every existing slate-* class in one move.
export const ink = {
  50: '#f6faf8',
  100: '#ecf3ef',
  200: '#dce7e2',
  300: '#bfcec7',
  400: '#93a69d',
  500: '#64766e',
  600: '#4a5a53',
  700: '#2e3b36',
  800: '#1b2622',
  900: '#0c1210',
  950: '#070c0a',
} as const

// Display face carries the brand personality (headlines, wordmark, big
// numerals); body text stays on the native stack.
export const fonts = {
  display: ['Bricolage Grotesque Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
}

// Chart fills use the deeper shades; text on dark surfaces uses the defaults.
export const categoryColors: Record<Category, string> = {
  productive: palette.productive.deep,
  distraction: palette.breaks.deep,
  neutral: palette.neutral.deep,
  uncategorized: palette.neutral.deep,
}
