/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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
    include: ['src/**/*.spec.ts'],
    pool: 'threads',
    poolOptions: {
      threads: { minThreads: 1, maxThreads: 1 }
    }
  }
})
