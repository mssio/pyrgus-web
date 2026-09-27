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

test('no built file references a data: URI', () => {
  for (const file of files(DIST).filter((f) => /\.(html|css|js)$/.test(f))) {
    const text = readFileSync(file, 'utf8')
    expect(text, file).not.toMatch(/url\(\s*["']?data:/)
    expect(text, file).not.toMatch(/(src|href)="data:/)
  }
})
