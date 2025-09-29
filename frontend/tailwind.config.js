/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7B4B2A",
          dark: "#5A3820",
        },
        accent: {
          primary: "#E97451",
          secondary: "#FF8C42",
        },
        taupe: {
          DEFAULT: "#CBBBA0",
          dark: "#BFA27A",
        },
      },
      borderRadius: {
        DEFAULT: "1rem",
      },
    },
  },
  plugins: [],
}
