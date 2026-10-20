/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F1F3EC',
          hover: '#F6F7F2',
        },
        ink: {
          DEFAULT: '#242922',
          muted: '#52594F',
          light: '#727A6E',
        },
        brand: {
          DEFAULT: '#347A5C',
          deep: '#255640',
          dark: '#1C3F2F',
          soft: '#E4F0E6',
          light: '#F0F6F1',
        },
        accent: {
          peach: '#F5E2D4',
          'peach-light': '#FAF0E8',
          yellow: '#F2E7BE',
          'yellow-light': '#FAF6E6',
        },
        line: {
          DEFAULT: '#E6E7DF',
          subtle: '#EEF0E9',
        },
        status: {
          error: '#B84242',
          'error-soft': '#FDF2F2',
          success: '#347A5C',
          'success-soft': '#E4F0E6',
          warning: '#D97706',
          'warning-soft': '#FEF3C7',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        editorial: ['var(--font-editorial)', 'Georgia', 'serif'],
      },
      borderRadius: {
        'pill': '9999px',
        'card': '18px',
        'modal': '24px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(36, 41, 34, 0.04), 0 4px 12px rgba(36, 41, 34, 0.02)',
        'elevated': '0 4px 20px rgba(36, 41, 34, 0.06), 0 1px 4px rgba(36, 41, 34, 0.03)',
        'float': '0 12px 36px -4px rgba(36, 41, 34, 0.1), 0 2px 6px rgba(36, 41, 34, 0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
