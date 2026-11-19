// frontend/postcss.config.js

export default {
    plugins: {
      // FIX: Change 'tailwindcss' to '@tailwindcss/postcss'
      '@tailwindcss/postcss': {}, 
      autoprefixer: {},
      // Keep this order: Tailwind must run before Autoprefixer
    },
  }