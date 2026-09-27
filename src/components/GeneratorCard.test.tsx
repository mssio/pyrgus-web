// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cancelPendingClear } from '../lib/clipboard'
import { FORMAT_LABELS } from '../core/formats'
import { FORMAT_KEY, PIN_LENGTH_KEY } from '../lib/preferences'
import { GeneratorCard } from './GeneratorCard'

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

afterEach(() => {
  cancelPendingClear()
  localStorage.clear()
})

describe('GeneratorCard', () => {
  it('shows a Standard password and its entropy on load', () => {
    setup()
    expect(secret()).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
    expect(screen.getByText('90.1 bits of entropy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Format: Standard' })).toBeInTheDocument()
  })

  it('switches format from the menu and remembers it', async () => {
    const user = setup()
    await chooseFormat(user, 'Secret 256')
    expect(secret()).toMatch(/^[0-9a-f]{64}$/)
    expect(screen.getByText('256 bits of entropy')).toBeInTheDocument()
    expect(localStorage.getItem(FORMAT_KEY)).toBe('secret256')
  })

  it('shows the PIN length control only for PIN', async () => {
    const user = setup()
    expect(screen.queryByRole('radiogroup', { name: 'PIN length' })).not.toBeInTheDocument()
    await chooseFormat(user, 'PIN')
    expect(screen.getByRole('radiogroup', { name: 'PIN length' })).toBeInTheDocument()
    expect(secret()).toMatch(/^\d{6}$/)
    await user.click(screen.getByRole('radio', { name: '8 digits' }))
    expect(secret()).toMatch(/^\d{8}$/)
    await chooseFormat(user, 'Standard')
    expect(screen.queryByRole('radiogroup', { name: 'PIN length' })).not.toBeInTheDocument()
  })

  it('restores stored settings', () => {
    localStorage.setItem(FORMAT_KEY, 'pin')
    localStorage.setItem(PIN_LENGTH_KEY, '4')
    setup()
    expect(secret()).toMatch(/^\d{4}$/)
    expect(screen.getByRole('radio', { name: '4 digits' })).toBeChecked()
  })

  it('regenerates', async () => {
    const user = setup()
    const before = secret()
    await user.click(screen.getByRole('button', { name: 'Regenerate' }))
    expect(secret()).not.toBe(before)
  })

  it('copies the displayed value and confirms', async () => {
    const user = setup()
    const shown = secret()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(shown)
    expect(screen.getByRole('button', { name: 'Copied ✓' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
  })

  it('copies when the secret itself is clicked', async () => {
    const user = setup()
    await user.click(screen.getByTestId('secret'))
    expect(writeText).toHaveBeenCalledWith(secret())
  })

  it('never claims success when the clipboard refuses', async () => {
    const user = setup()
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.queryByRole('button', { name: 'Copied ✓' })).not.toBeInTheDocument()
    expect(screen.getByText("Couldn't copy. Select the password and copy it manually.")).toBeInTheDocument()
  })

  it('spells the secret for screen readers and hides the visual copy from them', () => {
    setup()
    expect(screen.getByTestId('secret')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText(/^Generated password: /)).toHaveClass('sr-only')
  })

  it('replaces the status region child node on each regenerate, even with the same text', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Regenerate' }))
    const firstChild = screen.getByRole('status').firstChild
    await user.click(screen.getByRole('button', { name: 'Regenerate' }))
    const secondChild = screen.getByRole('status').firstChild
    expect(screen.getByRole('status')).toHaveTextContent('New password generated')
    expect(secondChild).not.toBe(firstChild)
  })

  it('marks the secret and its spelled form as non-translatable', () => {
    setup()
    const wrapper = screen.getByTestId('secret').closest('[translate="no"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper).toContainElement(screen.getByText(/^Generated password: /))
  })

  it('keeps every format menu item aligned by always rendering its icon slot', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /^Format:/ }))
    for (const label of Object.values(FORMAT_LABELS)) {
      const item = screen.getByRole('menuitem', { name: label })
      const icon = item.querySelector('[data-slot="icon"]')
      expect(icon).not.toBeNull()
      if (label === 'Standard') {
        expect(icon).not.toHaveClass('invisible')
      } else {
        expect(icon).toHaveClass('invisible')
      }
    }
  })
})
