/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B2A4A',
          sky: '#7CC4F5',
          cyan: '#22D3EE',
          blue: '#3B82F6',
          bg: '#F4F9FF',
          'bg-secondary': '#EEF4FF',
          'bg-lavender': '#F6F4FF',
          muted: '#47617D', // WCAG AA verified (5.4:1 contrast on #F4F9FF)
          border: '#CBD5E1',
          error: '#DC2626',
          success: '#16A34A',
          ring: '#22D3EE',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      maxWidth: {
        mobile: '480px',
      },
    },
  },
  plugins: [],
};
