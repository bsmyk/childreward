import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Express backend the dev server proxies API calls to.
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward todos API to the Express backend so the SPA and API run
      // together in dev without any CORS setup.
      '/todos': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
