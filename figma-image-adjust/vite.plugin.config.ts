import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    target: 'es2017',  // 讓 esbuild 將 object spread 轉為 Object.assign，相容 Figma sandbox（Figma 原生支援 async/await）
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
