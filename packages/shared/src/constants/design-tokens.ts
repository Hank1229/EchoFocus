import type { Category } from '../types'

// Dark-only palette (2026-09 renovation). Teal is the sole brand/interactive
// color; emerald is reserved for productive time, orange for Breaks & Browsing.
// Red never marks a category — rose exists only for error feedback.
export const palette = {
  brand: { soft: '#5eead4', DEFAULT: '#2dd4bf', deep: '#14b8a6' },
  productive: { DEFAULT: '#34d399', deep: '#10b981' },
  breaks: { DEFAULT: '#fb923c', deep: '#f97316' },
  neutral: { DEFAULT: '#94a3b8', deep: '#64748b' },
  danger: { DEFAULT: '#fb7185', deep: '#f43f5e' },
} as const

// Chart fills use the deeper shades; text on dark surfaces uses the defaults.
export const categoryColors: Record<Category, string> = {
  productive: palette.productive.deep,
  distraction: palette.breaks.deep,
  neutral: palette.neutral.deep,
  uncategorized: palette.neutral.deep,
}
