import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@hello-pangea/dnd']
  },
  build: {
    commonjsOptions: {
      include: [/@hello-pangea\/dnd/, /node_modules/]
    }
  },
  base: '/road-tripper/',
})
