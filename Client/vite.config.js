import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:5000'

const proxy = {
  '/api': {
    target: apiTarget,
    changeOrigin: true,
  },
  '/uploads': {
    target: apiTarget,
    changeOrigin: true,
  },
  '/robots.txt': {
    target: apiTarget,
    changeOrigin: true,
  },
  '/sitemap.xml': {
    target: apiTarget,
    changeOrigin: true,
  },
  '/feed.xml': {
    target: apiTarget,
    changeOrigin: true,
  },
  '/rss.xml': {
    target: apiTarget,
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
