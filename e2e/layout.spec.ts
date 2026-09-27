import { expect, test, type Page } from '@playwright/test'

/** Gaps between the header and the main content, and between the main content and the footer. */
async function gaps(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('header')!.getBoundingClientRect()
    const footer = document.querySelector('footer')!.getBoundingClientRect()
    const main = document.querySelector('main')!
    const first = main.firstElementChild!.getBoundingClientRect()
    const last = main.lastElementChild!.getBoundingClientRect()
    return { above: first.top - header.bottom, below: footer.top - last.bottom }
  })
}

const generator = (page: Page) => page.locator('section[aria-labelledby="generator-heading"]')

async function chooseFormat(page: Page, label: string) {
  await page.getByRole('button', { name: /^Format:/ }).click()
  await page.getByRole('menuitem', { name: label }).click()
}

test('the generator is vertically centred between header and footer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.getByTestId('secret')).not.toBeEmpty()
  const { above, below } = await gaps(page)
  expect(above).toBeGreaterThan(40)
  expect(Math.abs(above - below)).toBeLessThanOrEqual(1)
})

test('the generator is 32rem wide with a 30 px secret from 640 px, and unchanged on phones', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  expect((await generator(page).boundingBox())?.width).toBe(512)
  expect(await page.getByTestId('secret').evaluate((el) => getComputedStyle(el).fontSize)).toBe('30px')

  await page.setViewportSize({ width: 320, height: 800 })
  expect((await generator(page).boundingBox())?.width).toBe(320)
  expect(await page.getByTestId('secret').evaluate((el) => getComputedStyle(el).fontSize)).toBe('24px')
})

test('Secret 256 at 30 px wraps without overflow at 640 px', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 })
  await page.goto('/')
  await chooseFormat(page, 'Secret 256')
  const secret = page.getByTestId('secret')
  await expect(secret).toHaveText(/^[0-9a-f]{64}$/)
  const m = await secret.evaluate((el) => ({
    fontSize: getComputedStyle(el).fontSize,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    docWidth: document.documentElement.scrollWidth,
  }))
  expect(m.fontSize).toBe('30px')
  expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth)
  expect(m.docWidth).toBeLessThanOrEqual(640)
})

test('on a short viewport the content never overlaps the header or footer; the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 })
  await page.goto('/')
  await expect(page.getByTestId('secret')).not.toBeEmpty()
  const { above, below } = await gaps(page)
  expect(above).toBeGreaterThanOrEqual(0)
  expect(below).toBeGreaterThanOrEqual(0)
  const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)
  expect(scrollable).toBe(true)
})

/** Selects a format and, for the configurable ones, its maximum length or word count. */
async function chooseLargest(page: Page, label: string) {
  if (label !== 'Password') await chooseFormat(page, label)
  const slider =
    label === 'Custom Password'
      ? page.getByRole('slider', { name: 'Password length' })
      : label === 'Memorable'
        ? page.getByRole('slider', { name: 'Words' })
        : null
  if (slider) {
    await slider.focus()
    await slider.press('End')
  }
  await expect(page.getByTestId('secret')).not.toBeEmpty()
}

for (const label of ['Password', 'Custom Password', 'Memorable']) {
  test(`${label} at its largest is vertically centred on a tall desktop viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 })
    await page.goto('/')
    await chooseLargest(page, label)
    const { above, below } = await gaps(page)
    expect(above).toBeGreaterThan(40)
    expect(Math.abs(above - below)).toBeLessThanOrEqual(1)
  })

  test(`${label} at its largest never overlaps the header or footer on a short viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 400 })
    await page.goto('/')
    await chooseLargest(page, label)
    const { above, below } = await gaps(page)
    expect(above).toBeGreaterThanOrEqual(0)
    expect(below).toBeGreaterThanOrEqual(0)
    const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)
    expect(scrollable).toBe(true)
  })
}
