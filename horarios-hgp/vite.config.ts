import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: true,
    // Permite túneles públicos (Cloudflare / localtunnel) en demos
    allowedHosts: true,
  },
})
