import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/__tests__/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/taxEngine.js'],
    },
  },
});
