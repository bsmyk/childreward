import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-server proxy: the SPA talks to the API with RELATIVE paths so the same
// URLs resolve same-origin in production (Express serves client/dist/). In dev,
// Vite serves the app on its own port, so we forward the API path-space to the
// Express backend at http://localhost:3000.
//
// Path convention (keep dev and prod in sync):
//   - `/health`  the existing health probe consumed by the app shell
//   - `/api`     reserved prefix for future namespaced API endpoints
//   - the reward API paths the SPA actually calls (rewards/todos/balance/...)
// Anything else is treated as an app route and served by Vite (dev) / the SPA
// fallback (prod).
const API_TARGET = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': { target: API_TARGET, changeOrigin: true },
      '/api': { target: API_TARGET, changeOrigin: true },
      '/rewards': { target: API_TARGET, changeOrigin: true },
      '/todos': { target: API_TARGET, changeOrigin: true },
      '/balance': { target: API_TARGET, changeOrigin: true },
      '/redemptions': { target: API_TARGET, changeOrigin: true },
    },
  },
  // Output goes to the default client/dist/, which the backend serves in prod.
  build: {
    outDir: 'dist',
  },
  // Vitest config: jsdom environment with global test APIs and a shared setup
  // file that registers @testing-library/jest-dom matchers.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
