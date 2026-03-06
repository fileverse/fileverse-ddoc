/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../package/**/*.{js,ts,tsx,jsx}',
  ],
  theme: {
    extend: {
      screens: {
        mobile: '960px',
      },
    },
  },
  plugins: [import('tailwindcss-animate').then((mod) => mod.default || mod)],
};
