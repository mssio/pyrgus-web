import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

// Playwright's webServer runs `npm run build` first, so dist/ is always fresh here.
const DIST = 'dist'

const files = (dir: string) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name))

test('every page is built', () => {
  for (const entry of ['index.html', 'privacy.html', 'support.html']) {
    expect(existsSync(join(DIST, entry)), entry).toBe(true)
  }
})

test('no built HTML file has an inline script or a style attribute', () => {
  const pages = files(DIST).filter((f) => f.endsWith('.html'))
  expect(pages.length).toBeGreaterThanOrEqual(4) // index, privacy, support, 404
  for (const file of pages) {
    const html = readFileSync(file, 'utf8')
    for (const tag of html.match(/<script\b[^>]*>/g) ?? []) expect(tag, file).toMatch(/\bsrc="/)
    expect(html, file).not.toMatch(/\sstyle="/)
  }
  for (const entry of ['index.html', 'privacy.html', 'support.html']) {
    const html = readFileSync(join(DIST, entry), 'utf8')
    expect((html.match(/<script\b[^>]*>/g) ?? []).length, entry).toBeGreaterThan(0)
  }
})

test("privacy.html's noscript summary gives the contact address", () => {
  const html = readFileSync(join(DIST, 'privacy.html'), 'utf8')
  expect(html).toMatch(/<noscript>[\s\S]*privacy@e\.mss\.io[\s\S]*<\/noscript>/)
})

test("support.html's noscript text gives the support address", () => {
  const html = readFileSync(join(DIST, 'support.html'), 'utf8')
  expect(html).toMatch(/<noscript>[\s\S]*support@e\.mss\.io[\s\S]*<\/noscript>/)
})

// Binary formats we ship (images, fonts): never text, and reading them as utf8 would produce
// false "matches" from decoded byte noise, so they are excluded rather than scanned.
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot)$/i

test('no built file references a data: URI', () => {
  const scanned = files(DIST).filter((f) => !BINARY_EXTENSIONS.test(f))
  // Guard against the check passing vacuously if the build output ever stops matching this shape.
  expect(scanned.length).toBeGreaterThan(0)
  expect(scanned.some((f) => f.endsWith('.svg'))).toBe(true)
  expect(scanned.some((f) => f.endsWith('.js'))).toBe(true)

  for (const file of scanned) {
    const text = readFileSync(file, 'utf8')
    // Matches the data URI shape itself (data:<type>/<subtype>; or ,) rather than a particular
    // attribute or string-quoting syntax, so it also catches compiled JSX (`src:"data:..."`),
    // srcSet lists, and data URIs embedded in plain string variables.
    expect(text, file).not.toMatch(/\bdata:[a-z-]+\/[a-z0-9.+-]+[;,]/i)
  }
})
