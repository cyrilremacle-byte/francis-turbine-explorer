import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLE=1 inlines everything into one self-contained index.html (used for hosted sharing).
export default defineConfig({
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 4000, outDir: process.env.SINGLE ? 'dist-single' : 'dist' },
  test: { environment: 'node' },
} as any)
