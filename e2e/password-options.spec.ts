import { expect, test, type Page } from '@playwright/test'
import { WORDLIST } from '../src/core/wordlist.js'

type ViolationWindow = Window & { __violations: string[] }

const pageErrors = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  // Injected over the DevTools protocol, so the page's CSP does not apply to it.
  await page.addInitScript(() => {
    const w = window as unknown as ViolationWindow
    w.__violations = []
    window.addEventListener('securitypolicyviolation', (e) => {
      w.__violations.push(`${e.violatedDirective} ${e.blockedURI}`)
    })
  })
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  pageErrors.set(page, errors)
})

test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as unknown as ViolationWindow).__violations)).toEqual([])
  expect(pageErrors.get(page)).toEqual([])
})

async function chooseFormat(page: Page, label: string) {
  await page.getByRole('button', { name: /^Format:/ }).click()
  await page.getByRole('menuitem', { name: label, exact: true }).click()
}

const secretText = async (page: Page) => (await page.getByTestId('secret').textContent()) ?? ''
const lengthSlider = (page: Page) => page.getByRole('slider', { name: 'Password length' })
const wordsSlider = (page: Page) => page.getByRole('slider', { name: 'Words' })
const symbolsSwitch = (page: Page) => page.getByRole('switch', { name: 'Include symbols' })
const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true })

/** Splits a Memorable result at its joins: a separator before a capitalized entry or the suffix. */
function memorableParts(value: string, sep: string): string[] {
  const escaped = sep === '-' ? '\\-' : sep
  return value.split(new RegExp(`${escaped}(?=[A-Z\\d])`))
}

test('custom controls support keyboard boundaries and exact copying', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await chooseFormat(page, 'Custom Password')
  const slider = lengthSlider(page)
  await slider.focus()
  for (const [key, value] of [
    ['Home', 6],
    ['ArrowRight', 7],
    ['End', 32],
  ] as const) {
    await slider.press(key)
    await expect(slider).toHaveValue(String(value))
    await expect(slider).toHaveAttribute('aria-valuetext', `${value} characters`)
    await expect(page.getByText(`Length: ${value}`)).toBeVisible()
    await expect(page.getByTestId('secret')).toHaveText(new RegExp(`^.{${value}}$`))
    await expect(slider).toBeFocused()
  }

  const toggle = symbolsSwitch(page)
  await toggle.focus()
  await toggle.press('Space')
  await expect(toggle).not.toBeChecked()
  await expect(toggle).toBeFocused()
  const plain = await secretText(page)
  expect(plain).toMatch(/^[A-Za-z0-9]{32}$/)
  for (const cls of [/[a-z]/, /[A-Z]/, /\d/]) expect(plain).toMatch(cls)

  await toggle.press('Space')
  await expect(toggle).toBeChecked()
  const withSymbols = await secretText(page)
  expect(withSymbols).toHaveLength(32)
  expect(withSymbols).toMatch(/[!@#$%^&*\-_=+?]/)

  await page.getByRole('button', { name: 'Copy', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(withSymbols)
})

test('memorable controls support every separator and preserve focus', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await chooseFormat(page, 'Memorable')
  const slider = wordsSlider(page)
  await slider.focus()
  for (const [key, count, bits] of [
    ['Home', 4, '61.7'],
    ['ArrowRight', 5, '74.6'],
    ['End', 8, '113.4'],
  ] as const) {
    await slider.press(key)
    await expect(slider).toHaveValue(String(count))
    await expect(slider).toHaveAttribute('aria-valuetext', `${count} words`)
    await expect(page.getByText(`${bits} bits of entropy`)).toBeVisible()
    await expect(slider).toBeFocused()
    expect(memorableParts(await secretText(page), '-')).toHaveLength(count + 1)
  }

  // The checked radio holds focus; arrows move the selection, as Headless UI's RadioGroup does.
  await radio(page, 'Hyphen (-)').focus()
  for (const [key, label, sep] of [
    ['ArrowLeft', 'Space', ' '],
    ['ArrowRight', 'Hyphen (-)', '-'],
    ['ArrowRight', 'Underscore (_)', '_'],
    ['ArrowLeft', 'Hyphen (-)', '-'],
    ['ArrowLeft', 'Space', ' '],
  ] as const) {
    await page.keyboard.press(key)
    await expect(radio(page, label)).toBeChecked()
    await expect(radio(page, label)).toBeFocused()
    const value = await secretText(page)
    expect(value.startsWith(sep)).toBe(false)
    expect(value.endsWith(sep)).toBe(false)
    const parts = memorableParts(value, sep)
    expect(parts).toHaveLength(9)
    expect(parts.at(-1)).toMatch(/^\d{3}$/)
    for (const entry of parts.slice(0, -1)) expect(entry).toMatch(/^[A-Z][a-z-]*$/)
  }

  const spaced = await secretText(page)
  await page.getByRole('button', { name: 'Copy', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toBe(spaced)
  expect(copied).toMatch(/ \d{3}$/)
})

test('saved format survives reload while options reset', async ({ page }) => {
  await page.goto('/')
  await chooseFormat(page, 'Custom Password')
  await lengthSlider(page).focus()
  await lengthSlider(page).press('Home')
  await symbolsSwitch(page).click()
  await chooseFormat(page, 'Memorable')
  await wordsSlider(page).focus()
  await wordsSlider(page).press('End')
  await radio(page, 'Underscore (_)').click()
  await chooseFormat(page, 'Custom Password')
  await expect(lengthSlider(page)).toHaveValue('6')
  await expect(symbolsSwitch(page)).not.toBeChecked()
  await chooseFormat(page, 'Memorable')
  await expect(wordsSlider(page)).toHaveValue('8')
  await expect(radio(page, 'Underscore (_)')).toBeChecked()

  await chooseFormat(page, 'Custom Password')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Format: Custom Password' })).toBeVisible()
  await expect(lengthSlider(page)).toHaveValue('24')
  await expect(symbolsSwitch(page)).toBeChecked()
  await expect(page.getByTestId('secret')).toHaveText(/^.{24}$/)

  await chooseFormat(page, 'Memorable')
  await wordsSlider(page).focus()
  await wordsSlider(page).press('End')
  await radio(page, 'Space').click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Format: Memorable' })).toBeVisible()
  await expect(wordsSlider(page)).toHaveValue('6')
  await expect(radio(page, 'Hyphen (-)')).toBeChecked()
  await expect(page.getByText('87.5 bits of entropy')).toBeVisible()

  await chooseFormat(page, 'PIN')
  await page.getByRole('radio', { name: '8 digits' }).click()
  const keys = await page.evaluate(() => Object.keys(localStorage).sort())
  expect(keys).toEqual(['pyrgus.format', 'pyrgus.pinLength'])
})

/** Index of the first longest EFF entry: every scripted draw selects it. */
const LONGEST = WORDLIST.reduce((best, w, i) => (w.length > WORDLIST[best].length ? i : best), 0)

test('long memorable results and controls fit 320 by 640', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  // Test-only: every random word is the index of the longest entry, so layout sees the worst case.
  await page.addInitScript((value) => {
    Object.defineProperty(crypto, 'getRandomValues', {
      value: <T extends ArrayBufferView | null>(array: T) => {
        ;(array as unknown as Uint32Array).fill(value)
        return array
      },
    })
  }, LONGEST)
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  const secret = page.getByTestId('secret')
  const copy = page.getByRole('button', { name: 'Copy', exact: true })

  async function expectFits(controls: ReturnType<typeof page.getByRole>[]) {
    const metrics = await secret.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      docWidth: document.documentElement.scrollWidth,
    }))
    expect(metrics.docWidth).toBeLessThanOrEqual(320)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight)
    for (const control of [...controls, copy]) {
      await control.scrollIntoViewIfNeeded()
      await expect(control).toBeInViewport({ ratio: 1 })
    }
    const shown = await secretText(page)
    await copy.click()
    await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown)
  }

  await chooseFormat(page, 'Memorable')
  await wordsSlider(page).focus()
  await wordsSlider(page).press('End')
  const word = WORDLIST[LONGEST][0].toUpperCase() + WORDLIST[LONGEST].slice(1)
  const suffix = String(LONGEST % 1000).padStart(3, '0')
  for (const [label, sep] of [
    ['Space', ' '],
    ['Hyphen (-)', '-'],
    ['Underscore (_)', '_'],
  ] as const) {
    await radio(page, label).click()
    await expect(secret).toHaveText([...Array<string>(8).fill(word), suffix].join(sep))
    await expectFits([
      wordsSlider(page),
      radio(page, 'Space'),
      radio(page, 'Hyphen (-)'),
      radio(page, 'Underscore (_)'),
    ])
  }

  await chooseFormat(page, 'Custom Password')
  await lengthSlider(page).focus()
  await lengthSlider(page).press('End')
  await expect(secret).toHaveText(/^.{32}$/)
  await expectFits([lengthSlider(page), symbolsSwitch(page)])
})
