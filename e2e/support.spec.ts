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
const heading = (page: Page) => page.getByRole('heading', { level: 1, name: 'Support' })
const FALLBACK = "If your mail app didn't open, email support@e.mss.io directly."

// Headless Chromium has no mail handler; it may log that it could not launch the mailto URL. That is the
// browser reporting the missing handler, not a page error.
const MAIL_HANDLER_MISSING = /^Failed to launch 'mailto:/

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !MAIL_HANDLER_MISSING.test(m.text())) errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function fillForm(page: Page) {
  await page.getByLabel('Topic').selectOption('Bug report')
  await page.getByLabel('Product').selectOption('Mac')
  await page.getByLabel('Message').fill('It crashed & burned?\nSteps: 1 + 1 = 3 #oops')
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

test('/support serves the form under the production headers with zero violations', async ({ page }) => {
  const errors = collectErrors(page)
  const response = await page.goto('/support')
  expect(response?.status()).toBe(200)
  expect(response?.headers()['content-security-policy']).toContain("form-action 'none'")
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'none'")
  expect(response?.headers()['content-security-policy']).toContain("require-trusted-types-for 'script'")

  await expect(heading(page)).toBeVisible()
  await expect(page).toHaveTitle('Support · Pyrgus')
  await expect(
    page.getByText('Questions, bugs or ideas about Pyrgus Web or the Pyrgus app? Send us a message.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'support@e.mss.io' })).toHaveAttribute('href', 'mailto:support@e.mss.io')

  expect(await violations(page)).toEqual([])
  expect(errors).toEqual([])
})

test('/support.html serves the same page', async ({ page }) => {
  const response = await page.goto('/support.html')
  expect(response?.status()).toBe(200)
  await expect(heading(page)).toBeVisible()
})

test('sending makes no network request and shows the fallback line', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/support')
  await page.waitForLoadState('networkidle')
  const requests: string[] = []
  page.on('request', (r) => requests.push(r.url()))

  await fillForm(page)
  await page.getByRole('button', { name: 'Open in Mail app' }).click()

  await expect(page.getByRole('status')).toHaveText(FALLBACK)
  await expect(page).toHaveURL(/\/support$/)
  await expect(page.getByLabel('Message')).toHaveValue('It crashed & burned?\nSteps: 1 + 1 = 3 #oops')
  // Chromium reports the mailto: navigation as a request event. It is the hand-off to the mail app, not a
  // network request; assert it is exactly the expected URL and that nothing else was requested.
  expect(requests).toEqual([
    'mailto:support@e.mss.io?subject=Pyrgus%3A%20Bug%20report%20(Mac)' +
      '&body=It%20crashed%20%26%20burned%3F%0D%0ASteps%3A%201%20%2B%201%20%3D%203%20%23oops',
  ])
  expect(await violations(page)).toEqual([])
  expect(errors).toEqual([])
})

test('an empty form opens nothing', async ({ page }) => {
  await page.goto('/support')
  await page.getByRole('button', { name: 'Open in Mail app' }).click()
  await expect(page.getByLabel('Topic')).toBeFocused()
  await expect(page.getByRole('status')).toBeEmpty()
  expect(await violations(page)).toEqual([])
})

test('the support page loads none of the generator code', async ({ browser }) => {
  // Guard against a vacuous pass: the generator page's scripts do contain it.
  const generator = await scriptBodies(browser, '/')
  expect(generator.some((b) => b.includes('getRandomValues'))).toBe(true)

  const support = await scriptBodies(browser, '/support')
  expect(support.length).toBeGreaterThan(0)
  for (const body of support) expect(body).not.toContain('getRandomValues')
})

test('fits a 320 × 640 phone with no horizontal scroll, before and after sending', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/support')
  await expect(heading(page)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  await fillForm(page)
  await page.getByRole('button', { name: 'Open in Mail app' }).click()
  await expect(page.getByRole('status')).toHaveText(FALLBACK)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  expect(await violations(page)).toEqual([])
})

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' })

  test('the heading and labels are light on the dark background', async ({ page }) => {
    await page.goto('/support')
    await expect(heading(page)).toHaveCSS('color', 'rgb(255, 255, 255)')
    for (const label of ['Topic', 'Product', 'Message']) {
      await expect(page.getByText(label, { exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)')
    }
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows the noscript text with the address', async ({ page }) => {
    await page.goto('/support')
    // Playwright's text matchers skip <noscript> content; innerText holds only what the browser renders.
    expect(await page.locator('body').innerText()).toContain(
      'This page needs JavaScript to show the support form. Email support@e.mss.io instead.',
    )
  })
})
