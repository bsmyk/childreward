import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-server proxy: the SPA talks to the API with RELATIVE paths so the same
// URLs resolve same-origin in production (Express serves client/dist/). In dev,
// Vite serves the app on its own port, so we forward the API path-space to the
// Express backend at http://localhost:3000.
//
// Path convention (keep dev and prod in sync):
//   - `/health`  the existing health probe consumed by the app shell
//   - `/api`     reserved prefix for all future API endpoints
// Anything else is treated as an app route and served by Vite (dev) / the SPA
// fallback (prod).
const API_TARGET = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': { target: API_TARGET, changeOrigin: true },
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
  // Output goes to the default client/dist/, which the backend serves in prod.
  build: {
    outDir: 'dist',
  },
});
