import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin /api avoids CORS. Plays the gateway's role in dev: one rule per service.
    proxy: {
      '/api/auth': 'http://localhost:3001',
      '/api/books': 'http://localhost:3002',
    },
  },
})
