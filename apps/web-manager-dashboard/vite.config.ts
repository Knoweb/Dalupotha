import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
    proxy: {
      '/api/notifications': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      },
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/notifications': {
        target: 'http://127.0.0.1:8085',
        changeOrigin: true,
        ws: true,  // Enable WebSocket proxying
        rewrite: (path) => path.replace(/^\/notifications/, '')
      }
    }
  }
})
