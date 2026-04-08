/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  safelist: ['theme-sepia', 'theme-pink'],
  content: ['./package/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        mobile: '960px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
