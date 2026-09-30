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
    setupFiles: ['./src/tests/setupSimulationRuntime.ts'],
    alias: {
      '@/': './src/'
    },
    // Balance analyses run 1000 simulations each, so they're opt-in: `npm run test:balance`.
    include: [process.env.BALANCE ? 'src/tests/**/*.balance.ts' : 'src/tests/**/*.spec.ts'],
    pool: 'threads',
    poolOptions: {
      threads: { minThreads: 1, maxThreads: 4 }
    }
  }
})
