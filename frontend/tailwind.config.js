import { colors, typography, spacing, borderRadius, boxShadow, animation, zIndex, breakpoints } from './src/design-system/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      letterSpacing: typography.letterSpacing,
      spacing,
      borderRadius,
      boxShadow,
      transitionDuration: animation.duration,
      transitionTimingFunction: animation.easing,
      zIndex,
      screens: breakpoints,
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear'
      }
    },
  },
  plugins: [],
};