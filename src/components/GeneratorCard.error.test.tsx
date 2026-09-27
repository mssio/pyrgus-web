// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FORMAT_KEY } from '../lib/preferences'
import { GeneratorCard, RANDOMNESS_ERROR } from './GeneratorCard'

vi.mock('../core/generate', () => ({
  generate: () => {
    throw new Error('crypto.getRandomValues is unavailable')
  },
}))

afterEach(() => {
  localStorage.clear()
})

function expectFailClosed() {
  expect(screen.getByRole('alert')).toHaveTextContent(RANDOMNESS_ERROR)
  expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled()
}

describe('GeneratorCard without secure randomness', () => {
  it('shows the error, no secret, and disables the actions', () => {
    render(<GeneratorCard />)
    expectFailClosed()
  })

  it('keeps the Custom Password controls usable and stays fail-closed after a change', () => {
    localStorage.setItem(FORMAT_KEY, 'strong')
    render(<GeneratorCard />)
    expectFailClosed()
    const slider = screen.getByRole('slider', { name: 'Password length' })
    expect(screen.getByRole('switch', { name: 'Include symbols' })).toBeInTheDocument()
    fireEvent.change(slider, { target: { value: '12' } })
    expect(slider).toHaveValue('12')
    expectFailClosed()
  })

  it('keeps the Memorable controls usable and stays fail-closed after a change', () => {
    localStorage.setItem(FORMAT_KEY, 'memorable')
    render(<GeneratorCard />)
    expectFailClosed()
    const slider = screen.getByRole('slider', { name: 'Words' })
    expect(screen.getByRole('radiogroup', { name: 'Separator' })).toBeInTheDocument()
    fireEvent.change(slider, { target: { value: '8' } })
    expect(slider).toHaveValue('8')
    expectFailClosed()
  })
})
