/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary — indigo (matches the share card / LP brand)
        'brand': {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Violet — the gradient partner
        'grape': {
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Accent — warm orange (the "you" pitch line / highlights)
        'accent': {
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
        },
        'ink': '#141527',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 10px 40px -12px rgba(79,70,229,0.18)',
        'glow': '0 0 40px rgba(79,70,229,0.12)',
        'card': '0 4px 24px -8px rgba(20,21,39,0.10)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        'brand-deep': 'linear-gradient(160deg, #4338ca 0%, #5b21b6 55%, #3b0764 100%)',
      },
    },
  },
  plugins: [],
};
