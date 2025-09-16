/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020'
  },
  test: {
    environment: 'node',
    alias: {
      '@/': './src/'
    },
    include: ['src/tests/**/*.spec.ts'],
    pool: 'threads',
    poolOptions: {
      threads: { minThreads: 1, maxThreads: 4 }
    }
  }
})
