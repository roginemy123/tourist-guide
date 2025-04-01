import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tguide2/',
  build: {
    outDir: 'docs'
  }
})