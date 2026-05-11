import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { emerald: '#2dd4bf', violet: '#8b5cf6', ink: '#020617' } },
      boxShadow: { glow: '0 0 80px rgba(45, 212, 191, 0.24)' }
    }
  },
  plugins: []
};

export default config;
