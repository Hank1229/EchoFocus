/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        productive: {
          DEFAULT: '#22c55e',
          light: '#dcfce7',
          dark: '#16a34a',
        },
        distraction: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          dark: '#dc2626',
        },
        neutral: {
          DEFAULT: '#94a3b8',
          light: '#f1f5f9',
          dark: '#64748b',
        },
      },
      width: {
        popup: '360px',
      },
    },
  },
  plugins: [],
}
