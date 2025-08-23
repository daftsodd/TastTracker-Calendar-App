import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      colors: {
        brand: {
          DEFAULT: '#12B886',
          50: '#EAF8F3',
          100: '#D5F1E7',
          200: '#ABE3CF',
          300: '#81D6B7',
          400: '#57C89F',
          500: '#2DBA87',
          600: '#12B886',
          700: '#0E8C67',
          800: '#0A6047',
          900: '#053428',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#F7F7F9',
          card: '#ffffff',
          border: '#E5E7EB',
        },
        text: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        event: {
          DEFAULT: '#E8FAF1',
          border: '#AFECD5',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config
