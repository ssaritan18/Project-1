/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        'brand-primary-start': '#FF3CAC',
        'brand-primary-mid': '#B74BFF', 
        'brand-primary-end': '#00CFFF',
        'brand-secondary': '#FFB347',
        'brand-black': '#000000',
        'brand-white': '#FFFFFF',
        'brand-gray': '#B9B9B9',
        
        // ADHD-friendly variations
        'calm-gradient-start': '#FF3CAC',
        'calm-gradient-mid': '#B74BFF',
        'calm-gradient-end': '#00CFFF',
        'warm-accent': '#FFB347',
      },
      fontFamily: {
        'urbanist': ['Urbanist', 'sans-serif'],
      },
      fontSize: {
        'heading': ['40px', { lineHeight: '1.2' }],
        'title': ['28px', { lineHeight: '1.3' }],
        'subheading': ['24px', { lineHeight: '1.4' }],
        'body': ['16px', { lineHeight: '1.5' }],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(255, 60, 172, 0.3)',
        'soft': '0 4px 20px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}