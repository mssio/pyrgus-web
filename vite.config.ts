import { readFileSync } from 'node:fs'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

type VercelConfig = { headers: { source: string; headers: { key: string; value: string }[] }[] }

// vite preview (and therefore Playwright) sends exactly the production headers.
// The dev server does not: Vite's HMR and React Refresh inject inline scripts the CSP would block.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as VercelConfig
const securityHeaders = Object.fromEntries(vercel.headers.flatMap((rule) => rule.headers).map((h) => [h.key, h.value]))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  build: {
    // The polyfill can inject inline script, which the CSP blocks; every target browser supports modulepreload.
    modulePreload: { polyfill: false },
    // Never inline assets as data: URIs; img-src/font-src 'self' would block them.
    assetsInlineLimit: 0,
  },
  preview: { headers: securityHeaders },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test-support/**/*.test.ts'],
    setupFiles: ['test-support/setup.ts'],
  },
})
