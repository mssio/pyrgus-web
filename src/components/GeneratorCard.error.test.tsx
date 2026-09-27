// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GeneratorCard, RANDOMNESS_ERROR } from './GeneratorCard'

vi.mock('../core/generate', () => ({
  generate: () => {
    throw new Error('crypto.getRandomValues is unavailable')
  },
}))

describe('GeneratorCard without secure randomness', () => {
  it('shows the error, no secret, and disables the actions', () => {
    render(<GeneratorCard />)
    expect(screen.getByRole('alert')).toHaveTextContent(RANDOMNESS_ERROR)
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled()
  })
})
