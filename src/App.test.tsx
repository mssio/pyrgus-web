// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { SAMPLE_SECRET } from './components/PhoneMockup'
import { EFF_WORDLIST_URL, REPO_URL } from './config'

describe('App', () => {
  it('renders the generator, the apps section and the footer', () => {
    render(<App />)
    expect(screen.getByTestId('secret')).toBeInTheDocument()

    const apps = screen.getByRole('region', { name: 'Pyrgus is coming to iPhone, iPad & Mac' })
    expect(apps).toHaveAttribute('id', 'apps')
    expect(within(apps).getByText('On-device. No account, no net.')).toBeInTheDocument()
    expect(within(apps).getByText('Coming soon · iPhone · iPad · Mac')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Pyrgus for iPhone, iPad & Mac — coming soon ↓' })).toHaveAttribute(
      'href',
      '#apps',
    )
    expect(screen.getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'EFF long wordlist' })).toHaveAttribute('href', EFF_WORDLIST_URL)
    expect(screen.getByText('Passwords are generated in your browser and never leave it.')).toBeInTheDocument()
  })

  it('never shows a real generated value in the phone mockup', () => {
    const { container } = render(<App />)
    const phone = container.querySelector('[data-mockup="phone"]')
    expect(phone).toHaveAttribute('aria-hidden', 'true')
    expect(phone?.textContent).toContain(SAMPLE_SECRET)
    expect(phone?.textContent).not.toContain(screen.getByTestId('secret').textContent)
  })
})
