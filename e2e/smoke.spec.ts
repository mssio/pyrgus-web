import { expect, test, type Page } from '@playwright/test'

type ViolationWindow = Window & { __violations: string[] }

test.beforeEach(async ({ page }) => {
  // Injected over the DevTools protocol, so the page's CSP does not apply to it.
  await page.addInitScript(() => {
    const w = window as unknown as ViolationWindow
    w.__violations = []
    window.addEventListener('securitypolicyviolation', (e) => {
      w.__violations.push(`${e.violatedDirective} ${e.blockedURI}`)
    })
  })
})

const violations = (page: Page) => page.evaluate(() => (window as unknown as ViolationWindow).__violations)

async function chooseFormat(page: Page, label: string) {
  await page.getByRole('button', { name: /^Format:/ }).click()
  await page.getByRole('menuitem', { name: label }).click()
}

test('generates and copies with zero CSP or Trusted Types violations', async ({ page, context }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("require-trusted-types-for 'script'")

  const secret = page.getByTestId('secret')
  await expect(secret).toHaveText(/^[^-]{6}-[^-]{6}-[^-]{6}$/)

  await chooseFormat(page, 'Secret 256')
  await expect(secret).toHaveText(/^[0-9a-f]{64}$/)

  await page.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await secret.textContent())

  expect(await violations(page)).toEqual([])
  expect(errors).toEqual([])
})

test('Secret 256 wraps without overflow or truncation at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/')
  await chooseFormat(page, 'Secret 256')

  const secret = page.getByTestId('secret')
  await expect(secret).toHaveText(/^[0-9a-f]{64}$/)
  const m = await secret.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    height: el.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(el).lineHeight),
    docWidth: document.documentElement.scrollWidth,
  }))
  expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth)
  expect(m.docWidth).toBeLessThanOrEqual(320)
  expect(m.height).toBeGreaterThanOrEqual(2 * m.lineHeight) // wrapped, not clipped to one line
  expect(m.scrollHeight).toBeLessThanOrEqual(m.clientHeight) // not vertically clipped (line-clamp, max-height)
  expect(await violations(page)).toEqual([])
})
