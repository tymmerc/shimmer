import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#fbf9f4',
          warm: '#f4efe4',
          deep: '#ede7d8',
        },
        ink: {
          DEFAULT: '#0d0b14',
          soft: '#3b2e54',
          mute: 'rgba(13,11,20,0.62)',
          ghost: 'rgba(13,11,20,0.32)',
        },
        toxic: {
          50: '#f4ecff',
          100: '#e7d6ff',
          200: '#cba8ff',
          300: '#a778ff',
          400: '#8b4dff',
          500: '#6a2bf5',
          600: '#4f1dc7',
          700: '#3a1496',
          800: '#260a66',
          900: '#160340',
        },
        acid: {
          DEFAULT: '#d4ff3a',
          deep: '#a8e620',
        },
        bone: '#f1ece0',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-inter-tight)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        editorial: '-0.03em',
      },
      animation: {
        'shimmer-pulse': 'shimmer-pulse 6s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
      keyframes: {
        'shimmer-pulse': {
          '0%,100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
