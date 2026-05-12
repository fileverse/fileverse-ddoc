export default {
  darkMode: ['class'],
  safelist: ['theme-sepia', 'theme-pink', 'theme-green'],
  content: ['./package/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        mobile: '960px',
      },
    },
  },
  plugins: ['tailwindcss-animate'],
};
