// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrivacyPolicy } from './PrivacyPolicy'

describe('PrivacyPolicy', () => {
  it('has one h1 and the effective date', () => {
    render(<PrivacyPolicy />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByText('Effective 20 November 2026')).toBeInTheDocument()
  })

  it('has a section per platform plus Contacting us, Children, Changes and Contact', () => {
    render(<PrivacyPolicy />)
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(h2s).toEqual([
      'Pyrgus Web',
      'Pyrgus for iPhone, iPad and Mac',
      'Contacting us',
      'Children',
      'Changes',
      'Contact',
    ])
  })

  it('explains what happens when you email us, and links the support page', () => {
    render(<PrivacyPolicy />)
    expect(
      screen.getByText(
        /we receive your email address and whatever you write\. We use it only to reply to you, and we don't share it\./,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /The support page itself sends nothing: it opens your own mail app with the message filled in\./,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'support page' })).toHaveAttribute('href', '/support')
  })

  it('gives the privacy contact as a mailto link', () => {
    render(<PrivacyPolicy />)
    expect(screen.getByRole('link', { name: 'privacy@e.mss.io' })).toHaveAttribute('href', 'mailto:privacy@e.mss.io')
  })

  it('links the Vercel and Apple policies and the source repository', () => {
    render(<PrivacyPolicy />)
    expect(screen.getByRole('link', { name: "Vercel's privacy policy" })).toHaveAttribute(
      'href',
      'https://vercel.com/legal/privacy-policy',
    )
    expect(screen.getByRole('link', { name: "Apple's privacy policy" })).toHaveAttribute(
      'href',
      'https://www.apple.com/legal/privacy/',
    )
    expect(screen.getByRole('link', { name: 'public source repository' })).toHaveAttribute(
      'href',
      'https://github.com/mssio/pyrgus-web',
    )
  })

  it('states the key promises', () => {
    render(<PrivacyPolicy />)
    expect(screen.getByText(/It has no accounts, no analytics, no advertising and no tracking\./)).toBeInTheDocument()
    expect(screen.getByText(/We never see, receive or store the passwords you generate\./)).toBeInTheDocument()
    expect(
      screen.getByText(/Pyrgus collects no personal information from anyone, including children\./),
    ).toBeInTheDocument()
  })

  it('accurately describes saved options on web, links out, and current widget storage', () => {
    render(<PrivacyPolicy />)
    expect(
      screen.getByText(
        /your chosen format and its options in local storage \(PIN length, Custom Password length and symbols, and Memorable word count and separator\)\. Generated passwords are never stored\./,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Other options reset when you reload/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/the App Store, EFF wordlist and source code links lead to other sites/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Each Home Screen widget keeps its own format and option settings\./)).toBeInTheDocument()
    expect(screen.queryByText(/timestamp of your last copy/)).not.toBeInTheDocument()
  })
})
