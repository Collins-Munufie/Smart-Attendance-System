/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#070a13',
          800: '#0d1326',
          700: '#141d39',
          600: '#1d2a52',
        },
        primary: {
          500: '#00A8CC', // uTest Teal
          600: '#0092B0', // Medium Teal
          700: '#00819D', // Deep Teal
          300: '#4DC2DB', // Light Teal
          100: '#99DCEB', // Sky Teal
        },
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropFilter: {
        glass: 'blur(12px)',
      }
    },
  },
  plugins: [],
}
