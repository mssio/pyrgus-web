import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  build: {
    // The polyfill can inject inline script, which the CSP blocks; every target browser supports modulepreload.
    modulePreload: { polyfill: false },
    // Never inline assets as data: URIs; img-src/font-src 'self' would block them.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test-support/**/*.test.ts'],
    setupFiles: ['test-support/setup.ts'],
  },
})
