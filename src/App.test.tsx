// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { EFF_WORDLIST_URL, REPO_URL } from './config'

const PILL = 'Pyrgus for iPhone, iPad & Mac — coming soon'
const TITLE = 'Pyrgus is coming to iPhone, iPad & Mac'
const FEATURE_TITLES = [
  'On-device',
  'A widget that never shows your secret',
  'The clipboard clears itself',
  'Six formats',
]

const secret = () => screen.getByTestId('secret').textContent

describe('App', () => {
  it('renders the generator, the apps pill and the footer, with no apps content in the page', () => {
    render(<App />)
    expect(screen.getByTestId('secret')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: PILL })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    expect(document.getElementById('apps')).toBeNull()

    expect(screen.getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'EFF long wordlist' })).toHaveAttribute('href', EFF_WORDLIST_URL)
    expect(screen.getByText('Passwords are generated in your browser and never leave it.')).toBeInTheDocument()
  })

  it('links the privacy policy from the footer', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })

  it('links the support page from the footer', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support')
  })

  it('opens the apps dialog from the pill and closes it with Escape, returning focus to the pill', async () => {
    const user = userEvent.setup()
    render(<App />)
    const pill = screen.getByRole('button', { name: PILL })

    await user.click(pill)
    const dialog = await screen.findByRole('dialog', { name: TITLE })
    expect(within(dialog).getByText('Coming soon · iPhone · iPad · Mac')).toBeInTheDocument()
    expect(within(dialog).getByText('On-device. No account, no net.')).toBeInTheDocument()
    for (const title of FEATURE_TITLES) expect(within(dialog).getByText(title)).toBeInTheDocument()
    // The widget illustration is decorative and never shows a secret.
    expect(within(dialog).getByText('Copied ✓').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(within(dialog).getByText('••••••-••••••-••••••')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(pill).toHaveFocus())
  })

  it('closes with the Close button and leaves the password alone', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = secret()

    await user.click(screen.getByRole('button', { name: PILL }))
    const dialog = await screen.findByRole('dialog', { name: TITLE })
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(secret()).toBe(before)
  })

  it('opens from the keyboard and moves focus into the dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    const pill = screen.getByRole('button', { name: PILL })

    pill.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: TITLE })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
  })
})
