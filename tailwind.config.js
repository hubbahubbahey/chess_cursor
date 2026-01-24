/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep mahogany-inspired dark theme
        board: {
          light: '#e8d4b8',
          dark: '#b58863',
          highlight: '#f7ec5e',
          selected: '#829769'
        },
        surface: {
          900: '#0f0d0b',
          800: '#1a1714',
          700: '#252220',
          600: '#302c28',
          500: '#3d3733'
        },
        accent: {
          gold: '#d4a54a',
          copper: '#c87941',
          emerald: '#4ade80',
          ruby: '#f87171'
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Source Sans 3', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        board: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        card: '0 4px 16px rgba(0, 0, 0, 0.3)'
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        }
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out'
      }
    }
  },
  plugins: []
}
