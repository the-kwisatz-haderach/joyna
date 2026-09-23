/// <reference types="vitest/config" />
import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Mirrors joyna-app/templates/httproute.yaml's ReplacePrefixMatch: the
      // Go backend's routes have no /api prefix, so strip it here too.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    // Vite loads .env.local for every mode, including test — so a real
    // Maps key added there for manual dev/testing (see location-field.tsx)
    // would otherwise leak into the suite and flip LocationField out of the
    // no-API-key fallback its tests assume. Force it empty so test runs are
    // deterministic and don't depend on what's in a developer's local env.
    env: {
      VITE_GOOGLE_MAPS_API_KEY: '',
    },
  },
})
