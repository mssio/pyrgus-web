import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

// Playwright's webServer runs `npm run build` first, so dist/ is always fresh here.
const DIST = 'dist'

const files = (dir: string) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name))

test('index.html has no inline scripts and no style attributes', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  const scriptTags = html.match(/<script\b[^>]*>/g) ?? []
  expect(scriptTags.length).toBeGreaterThan(0)
  for (const tag of scriptTags) expect(tag).toMatch(/\bsrc="/)
  expect(html).not.toMatch(/\sstyle="/)
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
