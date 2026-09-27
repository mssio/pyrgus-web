// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScriptedRandom } from '../../test-support/seeded-random'
import { generate } from '../core/generate'
import { WORDLIST } from '../core/wordlist'
import { cancelPendingClear } from '../lib/clipboard'
import { GeneratorCard } from './GeneratorCard'

// A pass-through spy, so a test can script one generation's randomness through the real generator.
vi.mock('../core/generate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/generate')>()
  return { ...actual, generate: vi.fn(actual.generate) }
})
const generateSpy = vi.mocked(generate)
const { generate: realGenerate } = await vi.importActual<typeof import('../core/generate')>('../core/generate')

/** The next generation uses these draws instead of secure randomness. */
function scriptNext(draws: number[]) {
  generateSpy.mockImplementationOnce((id, options) => realGenerate(id, options, new ScriptedRandom(draws)))
}

const writeText = vi.fn(async () => {})

/** user-event installs its own clipboard stub in setup(); ours must be defined after it. */
function setup() {
  const user = userEvent.setup()
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText: vi.fn(async () => '') },
  })
  render(<GeneratorCard />)
  return user
}

const secret = () => screen.getByTestId('secret').textContent ?? ''

async function chooseFormat(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: /^Format:/ }))
  await user.click(screen.getByRole('menuitem', { name: label }))
}

const lengthSlider = () => screen.getByRole('slider', { name: 'Password length' })
const wordsSlider = () => screen.getByRole('slider', { name: 'Words' })
const symbolsSwitch = () => screen.getByRole('switch', { name: 'Include symbols' })
const radio = (name: string) => screen.getByRole('radio', { name })

afterEach(() => {
  cancelPendingClear()
  localStorage.clear()
  // mockReset also drops any unconsumed scriptNext and restores the pass-through implementation.
  generateSpy.mockReset()
})

describe('GeneratorCard — Custom Password and Memorable controls', () => {
  it('shows no option controls for Password', () => {
    setup()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Separator' })).not.toBeInTheDocument()
  })

  it('shows the Custom Password length and symbol controls at their defaults', async () => {
    const user = setup()
    await chooseFormat(user, 'Custom Password')
    const slider = lengthSlider()
    expect(slider).toHaveValue('24')
    expect(slider).toHaveAttribute('min', '6')
    expect(slider).toHaveAttribute('max', '32')
    expect(slider).toHaveAttribute('step', '1')
    expect(slider).toHaveAttribute('aria-valuetext', '24 characters')
    expect(screen.getByText('Length: 24')).toBeInTheDocument()
    expect(symbolsSwitch()).toBeChecked()
    expect(screen.queryByRole('radiogroup', { name: 'Separator' })).not.toBeInTheDocument()
  })

  it('shows the Memorable word count and separator controls at their defaults', async () => {
    const user = setup()
    await chooseFormat(user, 'Memorable')
    const slider = wordsSlider()
    expect(slider).toHaveValue('6')
    expect(slider).toHaveAttribute('min', '4')
    expect(slider).toHaveAttribute('max', '8')
    expect(slider).toHaveAttribute('step', '1')
    expect(slider).toHaveAttribute('aria-valuetext', '6 words')
    expect(screen.getByText('Words: 6')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Separator' })).toBeInTheDocument()
    expect(radio('Hyphen (-)')).toBeChecked()
    expect(radio('Space')).not.toBeChecked()
    expect(radio('Underscore (_)')).not.toBeChecked()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it.each(['PIN', 'Secret 128', 'Secret 256', 'Password'])('removes the option controls for %s', async (label) => {
    const user = setup()
    await chooseFormat(user, 'Custom Password')
    await chooseFormat(user, 'Memorable')
    await chooseFormat(user, label)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Separator' })).not.toBeInTheDocument()
  })

  it('regenerates Custom Password on every option change and updates the entropy', async () => {
    const user = setup()
    await chooseFormat(user, 'Custom Password')
    expect(screen.getByText('~149 bits of entropy')).toBeInTheDocument()

    fireEvent.change(lengthSlider(), { target: { value: '6' } })
    expect(secret()).toHaveLength(6)
    expect(screen.getByText('Length: 6')).toBeInTheDocument()
    expect(lengthSlider()).toHaveAttribute('aria-valuetext', '6 characters')
    expect(screen.getByText('~37 bits of entropy')).toBeInTheDocument()

    await user.click(symbolsSwitch())
    expect(symbolsSwitch()).not.toBeChecked()
    expect(secret()).toMatch(/^[A-Za-z0-9]{6}$/)
    expect(screen.getByText('~35 bits of entropy')).toBeInTheDocument()

    fireEvent.change(lengthSlider(), { target: { value: '32' } })
    expect(secret()).toMatch(/^[A-Za-z0-9]{32}$/)
    expect(screen.getByText('~190 bits of entropy')).toBeInTheDocument()
  })

  it('changes Memorable word count and separator, preserving the exact copied string', async () => {
    const user = setup()
    await chooseFormat(user, 'Memorable')
    fireEvent.change(wordsSlider(), { target: { value: '4' } })
    await user.click(radio('Space'))
    expect(screen.getByText('61.7 bits of entropy')).toBeInTheDocument()
    expect(screen.getByText('Words: 4')).toBeInTheDocument()
    const value = screen.getByTestId('secret').textContent!
    expect(value).toMatch(/^(?:[A-Z][a-z-]* ){4}\d{3}$/)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(value)
  })

  it.each([
    ['Space', ' '],
    ['Hyphen (-)', '-'],
    ['Underscore (_)', '_'],
  ])('joins Memorable entries with %s', async (label, sep) => {
    const user = setup()
    await chooseFormat(user, 'Memorable')
    if (label === 'Hyphen (-)') await user.click(radio('Space')) // Hyphen is the default; leave it and return.
    const escaped = sep === '-' ? '\\-' : sep
    await user.click(radio(label))
    expect(radio(label)).toBeChecked()
    expect(secret()).toMatch(new RegExp(`^(?:[A-Z][a-z-]*${escaped}){6}\\d{3}$`))
    expect(screen.getByText('87.5 bits of entropy')).toBeInTheDocument()
  })

  it('keeps internal hyphens with the underscore separator', async () => {
    const user = setup()
    await chooseFormat(user, 'Memorable')
    fireEvent.change(wordsSlider(), { target: { value: '4' } })
    const hyphenated = ['drop-down', 'felt-tip', 't-shirt', 'yo-yo'].map((w) => WORDLIST.indexOf(w))
    scriptNext([...hyphenated, 0])
    await user.click(radio('Underscore (_)'))
    expect(secret()).toBe('Drop-down_Felt-tip_T-shirt_Yo-yo_000')
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('Drop-down_Felt-tip_T-shirt_Yo-yo_000')
  })

  it('renders, speaks and copies a space-separated result exactly', async () => {
    const user = setup()
    await chooseFormat(user, 'Memorable')
    scriptNext([0, 1, WORDLIST.indexOf('drop-down'), WORDLIST.indexOf('yo-yo'), 1234, 7775, 7])
    await user.click(radio('Space'))
    const expected = 'Abacus Abdomen Drop-down Yo-yo Cone Zoom 007'
    expect(screen.getByTestId('secret').textContent).toBe(expected)
    const spoken = screen.getByText(/^Generated password: /)
    expect(spoken.textContent).toContain('capital A, b, a, c, u, s, space, capital A')
    expect(spoken.textContent).toContain('dash')
    expect(spoken.textContent).toMatch(/space, 0, 0, 7$/)
    const wrapper = screen.getByTestId('secret').closest('[translate="no"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper).toContainElement(spoken)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(expected)
    expect(screen.getByRole('status').textContent).not.toContain(expected)
  })

  it('restores each format’s settings after switching away and back', async () => {
    const user = setup()
    await chooseFormat(user, 'Custom Password')
    fireEvent.change(lengthSlider(), { target: { value: '10' } })
    await user.click(symbolsSwitch())
    await chooseFormat(user, 'Memorable')
    fireEvent.change(wordsSlider(), { target: { value: '8' } })
    await user.click(radio('Underscore (_)'))
    await chooseFormat(user, 'PIN')
    await chooseFormat(user, 'Custom Password')
    expect(lengthSlider()).toHaveValue('10')
    expect(symbolsSwitch()).not.toBeChecked()
    expect(secret()).toMatch(/^[A-Za-z0-9]{10}$/)
    await chooseFormat(user, 'Memorable')
    expect(wordsSlider()).toHaveValue('8')
    expect(radio('Underscore (_)')).toBeChecked()
    expect(secret()).toMatch(/^(?:[A-Z][a-z-]*_){8}\d{3}$/)
  })

  it('an option change clears Copied and copy-failed feedback', async () => {
    const user = setup()
    await chooseFormat(user, 'Custom Password')
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.getByRole('button', { name: 'Copied ✓' })).toBeInTheDocument()
    fireEvent.change(lengthSlider(), { target: { value: '12' } })
    expect(screen.queryByRole('button', { name: 'Copied ✓' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('New password generated')

    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.getByText("Couldn't copy. Select the password and copy it manually.")).toBeInTheDocument()
    await user.click(symbolsSwitch())
    expect(screen.queryByText("Couldn't copy. Select the password and copy it manually.")).not.toBeInTheDocument()
  })

  it('a repeated same-value event neither regenerates nor re-announces', async () => {
    const user = setup()
    await chooseFormat(user, 'Memorable')
    await user.click(radio('Space'))
    const before = { value: secret(), node: screen.getByRole('status').firstChild }
    await user.click(radio('Space'))
    fireEvent.change(wordsSlider(), { target: { value: '6' } })
    expect(secret()).toBe(before.value)
    expect(screen.getByRole('status').firstChild).toBe(before.node)
  })
})
