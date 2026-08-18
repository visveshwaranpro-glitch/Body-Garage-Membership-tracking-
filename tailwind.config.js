/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0B0D',
        panel: '#1C1C1E',
        'panel-2': '#242427',
        border: '#2A2A2E',
        accent: {
          DEFAULT: '#E31E24',
          dark: '#B3161B',
        },
        ink: '#F5F5F5',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px -4px rgba(227, 30, 36, 0.5)',
        'glow-sm': '0 0 12px -6px rgba(227, 30, 36, 0.6)',
        'card': '0 8px 30px -12px rgba(0,0,0,0.8)',
      },
    },
  },
  plugins: [],
};
