/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: "tw-",
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./docs/**/*.{md,mdx}"],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
