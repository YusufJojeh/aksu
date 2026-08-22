import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2f2b2c',
        gold: '#c99b2e',
        parchment: '#f5f2ed',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Arabic', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        paper: '0 18px 55px rgb(22 18 18 / 20%)',
      },
    },
  },
  plugins: [],
} satisfies Config
