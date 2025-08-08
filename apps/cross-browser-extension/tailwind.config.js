/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/popup.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2B7FFF',
      },
    },
  },
  corePlugins: {
    preflight: true,
  },
};


