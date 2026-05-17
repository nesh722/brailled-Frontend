export default {
  corePlugins: {
    preflight: false,  // Don't reset existing CSS
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}