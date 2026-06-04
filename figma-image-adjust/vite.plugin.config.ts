import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'plugin/code.ts'),
      name: 'code',
      fileName: () => 'plugin.js',
      formats: ['iife'],
    },
    rollupOptions: {
      external: [],
    },
  },
})
