import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#050505',
        surface: '#0f0f0f',
        accent: '#06b6d4',
        success: '#10b981',
        muted: '#71717a',
      },
    },
  },
  plugins: [],
};
export default config;
