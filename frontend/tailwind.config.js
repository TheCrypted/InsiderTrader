/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gresearch': {
          'yellow': '#e5fc54',
          'grey-200': '#f5f5f5',
          'grey-500': '#6b7280',
          'black': '#000000',
          'white': '#ffffff',
          'vivid-red': '#cf2e2e',
          'vivid-green': '#00d084',
          'vivid-cyan-blue': '#0693e3',
          'vivid-purple': '#9b51e0',
          'pale-cyan-blue': '#8ed1fc',
        }
      },
      fontFamily: {
        'sans': ['Roboto', 'Figtree', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'body-large': ['1.125rem', { lineHeight: '1.75rem' }],
        'h1-lg': ['3rem', { lineHeight: '1.2', fontWeight: '300' }],
      },
      spacing: {
        'section-py-md': '4rem',
      }
    },
  },
  plugins: [],
}

