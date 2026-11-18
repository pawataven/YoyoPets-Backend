import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Pure utils only (no Nuxt runtime), so plain Node is enough
export default defineConfig({
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) }
  },
  test: {
    include: ['app/**/*.test.ts'],
    environment: 'node'
  }
})
