import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#171717',
        primary: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        text: '#ededed',
        muted: '#a3a3a3',
      },
    },
  },
  plugins: [],
}
export default config