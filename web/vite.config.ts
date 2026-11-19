import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin /api avoids CORS. API_URL is set by compose; default fits running Vite on the host.
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3000' },
  },
})
