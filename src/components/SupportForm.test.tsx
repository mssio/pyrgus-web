// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupportForm } from './SupportForm'

const topic = () => screen.getByRole('combobox', { name: 'Topic' })
const product = () => screen.getByRole('combobox', { name: 'Product' })
const message = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement
const send = () => screen.getByRole('button', { name: 'Open in Mail app' })
const optionTexts = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((o) => o.textContent)

const BUG_MAC = 'mailto:support@e.mss.io?subject=Pyrgus%3A%20Bug%20report%20(Mac)'

function setup() {
  const open = vi.fn<(url: string) => void>()
  const user = userEvent.setup()
  render(<SupportForm open={open} />)
  return { open, user }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SupportForm', () => {
  it('offers the placeholder and exactly the listed options, in order', () => {
    setup()
    expect(optionTexts(topic())).toEqual(['Choose a topic…', 'Question', 'Bug report', 'Feature request', 'Other'])
    expect(optionTexts(product())).toEqual(['Choose a product…', 'Pyrgus Web', 'iPhone', 'iPad', 'Mac'])
    expect(topic()).toHaveValue('')
    expect(product()).toHaveValue('')
    expect(topic()).toBeRequired()
    expect(product()).toBeRequired()
    expect(message()).toBeRequired()
    expect(message()).toHaveAttribute('maxlength', '2000')
  })

  it('has no form action, so the browser never submits it', () => {
    setup()
    const form = send().closest('form')!
    expect(form).not.toHaveAttribute('action')
    expect(form).not.toHaveAttribute('method')
  })

  it('always shows the address as a plain mailto link', () => {
    setup()
    expect(screen.getByRole('link', { name: 'support@e.mss.io' })).toHaveAttribute('href', 'mailto:support@e.mss.io')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it.each([
    ['topic', { topic: false, product: true, message: true }],
    ['product', { topic: true, product: false, message: true }],
    ['message', { topic: true, product: true, message: false }],
  ])('opens nothing when the %s is missing', async (_, fill) => {
    const { open, user } = setup()
    if (fill.topic) await user.selectOptions(topic(), 'Bug report')
    if (fill.product) await user.selectOptions(product(), 'Mac')
    if (fill.message) await user.type(message(), 'Hello')
    await user.click(send())
    expect(open).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('refuses a whitespace-only message, then clears the error on input', async () => {
    const { open, user } = setup()
    await user.selectOptions(topic(), 'Bug report')
    await user.selectOptions(product(), 'Mac')
    await user.type(message(), '   ')
    await user.click(send())
    expect(open).not.toHaveBeenCalled()
    expect(message().validationMessage).toBe('Please enter a message.')

    await user.type(message(), 'x')
    expect(message().validationMessage).toBe('')
  })

  it('opens the exact mailto URL and shows the fallback line', async () => {
    const { open, user } = setup()
    await user.selectOptions(topic(), 'Bug report')
    await user.selectOptions(product(), 'Mac')
    await user.type(message(), 'Hello{Enter}Thanks')
    await user.click(send())

    expect(open).toHaveBeenCalledExactlyOnceWith(`${BUG_MAC}&body=Hello%0D%0AThanks`)
    expect(screen.getByRole('status')).toHaveTextContent(
      "If your mail app didn't open, email support@e.mss.io directly.",
    )
    expect(within(screen.getByRole('status')).getByRole('link', { name: 'support@e.mss.io' })).toHaveAttribute(
      'href',
      'mailto:support@e.mss.io',
    )
  })

  it('keeps the fields filled after sending', async () => {
    const { user } = setup()
    await user.selectOptions(topic(), 'Bug report')
    await user.selectOptions(product(), 'Mac')
    await user.type(message(), 'Hello')
    await user.click(send())
    expect(topic()).toHaveValue('Bug report')
    expect(product()).toHaveValue('Mac')
    expect(message()).toHaveValue('Hello')
  })

  it('sends the latest text on a second submit', async () => {
    const { open, user } = setup()
    await user.selectOptions(topic(), 'Bug report')
    await user.selectOptions(product(), 'Mac')
    await user.type(message(), 'First')
    await user.click(send())
    await user.clear(message())
    await user.type(message(), 'Second')
    await user.selectOptions(product(), 'iPad')
    await user.click(send())

    expect(open).toHaveBeenCalledTimes(2)
    expect(open).toHaveBeenLastCalledWith(
      'mailto:support@e.mss.io?subject=Pyrgus%3A%20Bug%20report%20(iPad)&body=Second',
    )
  })

  it('stores nothing', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { user } = setup()
    await user.selectOptions(topic(), 'Question')
    await user.selectOptions(product(), 'Pyrgus Web')
    await user.type(message(), 'Hello')
    await user.click(send())
    expect(setItem).not.toHaveBeenCalled()
  })
})
