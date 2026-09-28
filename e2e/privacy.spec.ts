import { expect, test, type Browser, type Page } from '@playwright/test'

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
const heading = (page: Page) => page.getByRole('heading', { level: 1, name: 'Privacy Policy' })

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/**
 * Loads a path in a fresh context (empty cache, so every script arrives as a 200 with a readable body)
 * and returns the text of every script it fetched.
 */
async function scriptBodies(browser: Browser, path: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const bodies: Promise<string>[] = []
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script') bodies.push(r.text())
  })
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  const result = await Promise.all(bodies)
  await context.close()
  return result
}

test('/privacy serves the policy under the production headers with zero violations', async ({ page }) => {
  const errors = collectErrors(page)
  const response = await page.goto('/privacy')
  expect(response?.status()).toBe(200)
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'none'")
  expect(response?.headers()['content-security-policy']).toContain("require-trusted-types-for 'script'")

  await expect(heading(page)).toBeVisible()
  await expect(page.getByText('Effective 28 September 2026')).toBeVisible()
  await expect(page.getByRole('link', { name: 'privacy@e.mss.io' })).toHaveAttribute('href', 'mailto:privacy@e.mss.io')
  await expect(page).toHaveTitle('Privacy Policy · Pyrgus')

  expect(await violations(page)).toEqual([])
  expect(errors).toEqual([])
})

test('/privacy.html serves the same page', async ({ page }) => {
  const response = await page.goto('/privacy.html')
  expect(response?.status()).toBe(200)
  await expect(heading(page)).toBeVisible()
})

test('the privacy page loads none of the generator code', async ({ browser }) => {
  // Guard against a vacuous pass: the generator page's scripts do contain it.
  const generator = await scriptBodies(browser, '/')
  expect(generator.some((b) => b.includes('getRandomValues'))).toBe(true)

  const privacy = await scriptBodies(browser, '/privacy')
  expect(privacy.length).toBeGreaterThan(0)
  for (const body of privacy) expect(body).not.toContain('getRandomValues')
})

test('fits a 320 × 640 phone with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/privacy')
  await expect(heading(page)).toBeVisible()
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(docWidth).toBeLessThanOrEqual(320)
  expect(await violations(page)).toEqual([])
})

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' })

  test('headings are light on the dark background', async ({ page }) => {
    await page.goto('/privacy')
    await expect(heading(page)).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(page.getByRole('heading', { level: 2, name: 'Pyrgus Web' })).toHaveCSS('color', 'rgb(255, 255, 255)')
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows the noscript summary with the contact address', async ({ page }) => {
    await page.goto('/privacy')
    // Playwright's text matchers skip <noscript> content; innerText holds only what the browser renders.
    expect(await page.locator('body').innerText()).toContain(
      'In short: Pyrgus collects no personal data. Questions: privacy@e.mss.io.',
    )
  })
})
