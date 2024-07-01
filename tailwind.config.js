/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  daisyui: {
    themes: [
      {
        light: {
          ...require('daisyui/src/theming/themes')['light'],
          '.tooltip-disabled': {
            '--tooltip-color': '#E8EBEC',
            '--tooltip-text-color': '#A1AAB1',
          },
          '.tooltip-neutral': {
            '--tooltip-color': '#000000',
            '--tooltip-text-color': '#FFFFFF',
          },
        },
      },
    ],
  },
  plugins: [require('tailwindcss-animate'), require('daisyui')],
}
