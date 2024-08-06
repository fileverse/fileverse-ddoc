/** @type {import('tailwindcss').Config} */
export default {
  content: ['./package/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
};
