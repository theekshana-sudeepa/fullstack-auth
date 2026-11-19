// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      // CRITICAL: Ensure this path covers all your component files
      "./src/**/*.{js,ts,jsx,tsx}", 
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }