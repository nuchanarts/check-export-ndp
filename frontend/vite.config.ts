import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const api = { '/api': { target: 'http://localhost:6010', changeOrigin: true } }

export default defineConfig({
  plugins: [react()],
  server: { port: 6011, proxy: api },
  preview: { port: 6110, proxy: api },
})
