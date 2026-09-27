// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelPendingClear } from '../lib/clipboard'
import { FORMAT_KEY, PIN_LENGTH_KEY } from '../lib/preferences'
import { COPIED_MS, usePyrgus } from './usePyrgus'

const writeText = vi.fn(async () => {})

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText: vi.fn(async () => '') },
  })
})

afterEach(() => {
  cancelPendingClear()
  localStorage.clear()
  vi.useRealTimers()
})

describe('usePyrgus', () => {
  it('generates a Standard password on mount', () => {
    const { result } = renderHook(() => usePyrgus())
    expect(result.current.format).toBe('standard')
    expect(result.current.password).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
    expect(result.current.entropy).toBe('90.1')
    expect(result.current.error).toBe(false)
    expect(result.current.announcement).toBe('')
  })

  it('regenerates when the format or PIN length changes, and persists only those two settings', () => {
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat('pin'))
    expect(result.current.password).toMatch(/^\d{6}$/)
    act(() => result.current.setPinLength(8))
    expect(result.current.password).toMatch(/^\d{8}$/)
    expect(result.current.entropy).toBe('26.6')
    expect(result.current.announcement).toBe('New password generated')

    expect(Object.keys(localStorage).sort()).toEqual([FORMAT_KEY, PIN_LENGTH_KEY].sort())
    for (const key of Object.keys(localStorage)) {
      expect(localStorage.getItem(key)).not.toBe(result.current.password)
    }
  })

  it('restores stored settings', () => {
    localStorage.setItem(FORMAT_KEY, 'pin')
    localStorage.setItem(PIN_LENGTH_KEY, '4')
    const { result } = renderHook(() => usePyrgus())
    expect(result.current.pinLength).toBe(4)
    expect(result.current.password).toMatch(/^\d{4}$/)
  })

  it('copies, shows copied for 2 s, then resets', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { result } = renderHook(() => usePyrgus())
    const password = result.current.password
    await act(() => result.current.copy())
    expect(writeText).toHaveBeenCalledWith(password)
    expect(result.current.copied).toBe(true)
    expect(result.current.announcement).toBe('Copied')
    act(() => vi.advanceTimersByTime(COPIED_MS - 1))
    expect(result.current.copied).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.copied).toBe(false)
  })

  it('a new password clears the copied state immediately', async () => {
    const { result } = renderHook(() => usePyrgus())
    await act(() => result.current.copy())
    expect(result.current.copied).toBe(true)
    act(() => result.current.regenerate())
    expect(result.current.copied).toBe(false)
  })

  it.each([
    ['regenerate', 'resolve'], ['regenerate', 'reject'],
    ['format', 'resolve'], ['format', 'reject'],
    ['pin length', 'resolve'], ['pin length', 'reject'],
  ] as const)('ignores a stale copy after %s when its write later %s', async (change, outcome) => {
    let resolveWrite!: () => void
    let rejectWrite!: (reason: Error) => void
    writeText.mockImplementationOnce(() => new Promise<void>((resolve, reject) => {
      resolveWrite = resolve
      rejectWrite = reject
    }))
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat('pin'))
    let pendingCopy!: Promise<void>
    act(() => { pendingCopy = result.current.copy() })
    act(() => {
      if (change === 'regenerate') result.current.regenerate()
      else if (change === 'format') result.current.setFormat('secret256')
      else result.current.setPinLength(8)
    })
    const currentPassword = result.current.password
    await act(async () => {
      if (outcome === 'resolve') resolveWrite()
      else rejectWrite(new Error('denied'))
      await pendingCopy
    })
    expect(result.current.password).toBe(currentPassword)
    expect(result.current.copied).toBe(false)
    expect(result.current.copyFailed).toBe(false)
    expect(result.current.announcement).toBe('New password generated')
  })

  it.each(['resolve', 'reject'] as const)(
    'ignores an older copy that later %s after a newer copy succeeds',
    async (outcome) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      let resolveWrite!: () => void
      let rejectWrite!: (reason: Error) => void
      writeText.mockImplementationOnce(() => new Promise<void>((resolve, reject) => {
        resolveWrite = resolve
        rejectWrite = reject
      }))
      const { result } = renderHook(() => usePyrgus())
      let first!: Promise<void>
      act(() => { first = result.current.copy() })
      await act(() => result.current.copy())
      act(() => vi.advanceTimersByTime(1000))
      await act(async () => {
        if (outcome === 'resolve') resolveWrite()
        else rejectWrite(new Error('denied'))
        await first
      })
      expect(result.current.copied).toBe(true)
      expect(result.current.copyFailed).toBe(false)
      expect(result.current.announcement).toBe('Copied')
      act(() => vi.advanceTimersByTime(COPIED_MS - 1000))
      expect(result.current.copied).toBe(false) // Stale success must not restart the timer.
    },
  )

  it('reports a refused clipboard write without claiming success', async () => {
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const { result } = renderHook(() => usePyrgus())
    await act(() => result.current.copy())
    expect(result.current.copied).toBe(false)
    expect(result.current.copyFailed).toBe(true)
    expect(result.current.announcement).toBe('Copy failed')
  })
})
