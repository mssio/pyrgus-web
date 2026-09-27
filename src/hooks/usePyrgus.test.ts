// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatEntropy } from '../core/entropy'
import { DEFAULT_OPTIONS, type FormatId, type Options } from '../core/formats'
import { generate } from '../core/generate'
import { InsecureRandomError } from '../core/random'
import { CLEAR_AFTER_MS, cancelPendingClear } from '../lib/clipboard'
import { FORMAT_KEY, PIN_LENGTH_KEY } from '../lib/preferences'
import { COPIED_MS, usePyrgus, type Pyrgus } from './usePyrgus'

// A pass-through spy: real generation, with call arguments recorded and one-off failures injectable.
vi.mock('../core/generate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/generate')>()
  return { ...actual, generate: vi.fn(actual.generate) }
})
const generateSpy = vi.mocked(generate)

let clipboardText: string
const writeText = vi.fn(async (text: string) => {
  clipboardText = text
})

beforeEach(() => {
  clipboardText = ''
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText: vi.fn(async () => clipboardText) },
  })
})

afterEach(() => {
  cancelPendingClear()
  localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
  generateSpy.mockClear()
})

describe('usePyrgus', () => {
  it('generates a Password on mount', () => {
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
    ['regenerate', 'resolve'],
    ['regenerate', 'reject'],
    ['format', 'resolve'],
    ['format', 'reject'],
    ['pin length', 'resolve'],
    ['pin length', 'reject'],
  ] as const)('ignores a stale copy after %s when its write later %s', async (change, outcome) => {
    let resolveWrite!: () => void
    let rejectWrite!: (reason: Error) => void
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve, reject) => {
          resolveWrite = resolve
          rejectWrite = reject
        }),
    )
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat('pin'))
    let pendingCopy!: Promise<void>
    act(() => {
      pendingCopy = result.current.copy()
    })
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
      writeText.mockImplementationOnce(
        () =>
          new Promise<void>((resolve, reject) => {
            resolveWrite = resolve
            rejectWrite = reject
          }),
      )
      const { result } = renderHook(() => usePyrgus())
      let first!: Promise<void>
      act(() => {
        first = result.current.copy()
      })
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

  it('regenerating dismisses copy feedback but keeps the 90 s clipboard clear armed', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.spyOn(document, 'hasFocus').mockReturnValue(true) // jsdom defaults to unfocused.
    const { result } = renderHook(() => usePyrgus())
    await act(() => result.current.copy())
    expect(clipboardText).toBe(result.current.password)

    act(() => result.current.regenerate())
    expect(result.current.copied).toBe(false) // Feedback is dismissed...

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    })
    expect(writeText).toHaveBeenCalledWith('') // ...but the clear of the already-copied secret still fires.
    expect(clipboardText).toBe('')
  })

  it('gives two consecutive regenerate() calls two distinct announcement events', () => {
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.regenerate())
    const first = { text: result.current.announcement, id: result.current.announcementId }
    act(() => result.current.regenerate())
    const second = { text: result.current.announcement, id: result.current.announcementId }
    expect(first.text).toBe('New password generated')
    expect(second.text).toBe('New password generated')
    expect(second.id).not.toBe(first.id)
  })

  it('starts with the default Custom Password and Memorable options', () => {
    const { result } = renderHook(() => usePyrgus())
    expect(result.current).toMatchObject({
      customLength: 24,
      includeSymbols: true,
      memorableWordCount: 6,
      memorableSeparator: '-',
    })
  })

  it('keeps Memorable settings across switches but resets them on remount', () => {
    const first = renderHook(() => usePyrgus())
    const { result } = first
    act(() => result.current.setFormat('memorable'))
    act(() => result.current.setMemorableWordCount(8))
    act(() => result.current.setMemorableSeparator(' '))
    expect(result.current).toMatchObject({ memorableWordCount: 8, memorableSeparator: ' ', entropy: '113.4' })
    act(() => result.current.setFormat('strong'))
    act(() => result.current.setCustomLength(6))
    act(() => result.current.setIncludeSymbols(false))
    expect(result.current).toMatchObject({ customLength: 6, includeSymbols: false, entropy: '~35' })
    expect(result.current.password).toMatch(/^[A-Za-z0-9]{6}$/)
    act(() => result.current.setFormat('memorable'))
    expect(result.current).toMatchObject({ memorableWordCount: 8, memorableSeparator: ' ', entropy: '113.4' })
    expect(result.current.password).toMatch(/^(?:[A-Z][a-z-]* ){8}\d{3}$/)
    first.unmount()

    const second = renderHook(() => usePyrgus())
    expect(second.result.current).toMatchObject({
      format: 'memorable',
      memorableWordCount: 6,
      memorableSeparator: '-',
      entropy: '87.5',
      customLength: 24,
      includeSymbols: true,
    })
  })

  it('restores a saved Custom Password with default options', () => {
    localStorage.setItem(FORMAT_KEY, 'strong')
    const { result } = renderHook(() => usePyrgus())
    expect(result.current).toMatchObject({ format: 'strong', customLength: 24, includeSymbols: true, entropy: '~149' })
    expect(result.current.password).toHaveLength(24)
  })
})

type Setter = 'setCustomLength' | 'setIncludeSymbols' | 'setMemorableWordCount' | 'setMemorableSeparator'
type Field = 'customLength' | 'includeSymbols' | 'memorableWordCount' | 'memorableSeparator'
/** Each option setter, the format it belongs to, its field and a value other than the default. */
const SETTERS: [Setter, FormatId, Field, Options[Field]][] = [
  ['setCustomLength', 'strong', 'customLength', 6],
  ['setIncludeSymbols', 'strong', 'includeSymbols', false],
  ['setMemorableWordCount', 'memorable', 'memorableWordCount', 8],
  ['setMemorableSeparator', 'memorable', 'memorableSeparator', ' '],
]
const OTHER_VALUE: Record<Field, Options[Field]> = {
  customLength: 32,
  includeSymbols: true,
  memorableWordCount: 4,
  memorableSeparator: '_',
}
const call = (p: Pyrgus, setter: Setter, value: unknown) => (p[setter] as (v: unknown) => void)(value)

describe('usePyrgus — option setters', () => {
  it.each(SETTERS)('%s regenerates %s with the complete next options', async (setter, format, field, value) => {
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat(format))
    await act(() => result.current.copy())
    expect(result.current.copied).toBe(true)
    const before = { ...result.current }
    generateSpy.mockClear()

    act(() => call(result.current, setter, value))
    const options = { ...DEFAULT_OPTIONS, [field]: value }
    expect(result.current[field]).toBe(value)
    expect(generateSpy).toHaveBeenCalledTimes(1)
    expect(generateSpy).toHaveBeenLastCalledWith(format, options)
    expect(result.current.password).toBe(generateSpy.mock.results[0].value)
    expect(result.current.entropy).toBe(formatEntropy(format, options))
    expect(result.current).toMatchObject({ copied: false, copyFailed: false, announcement: 'New password generated' })
    expect(result.current.announcementId).toBe(before.announcementId + 1)
    for (const other of ['customLength', 'includeSymbols', 'memorableWordCount', 'memorableSeparator'] as const) {
      if (other !== field) expect(result.current[other]).toBe(before[other])
    }
  })

  it.each(SETTERS)('%s with the current value does nothing', (setter, format, field) => {
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat(format))
    const before = { password: result.current.password, id: result.current.announcementId }
    generateSpy.mockClear()
    act(() => call(result.current, setter, DEFAULT_OPTIONS[field]))
    expect(result.current.password).toBe(before.password)
    expect(result.current.announcementId).toBe(before.id)
    expect(generateSpy).not.toHaveBeenCalled()
  })

  it('writes only the format and PIN length to storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => usePyrgus())
    for (const [setter, format, , value] of SETTERS) {
      act(() => result.current.setFormat(format))
      act(() => call(result.current, setter, value))
    }
    act(() => result.current.setFormat('pin'))
    act(() => result.current.setPinLength(4))
    expect(new Set(setItem.mock.calls.map(([key]) => key))).toEqual(new Set([FORMAT_KEY, PIN_LENGTH_KEY]))
    expect(Object.keys(localStorage).sort()).toEqual([FORMAT_KEY, PIN_LENGTH_KEY].sort())
    expect(localStorage.getItem(FORMAT_KEY)).toBe('pin')
    expect(localStorage.getItem(PIN_LENGTH_KEY)).toBe('4')
  })

  it('still generates when storage throws', () => {
    for (const method of ['getItem', 'setItem'] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError')
      })
    }
    const { result } = renderHook(() => usePyrgus())
    for (const [setter, format, field, value] of SETTERS) {
      act(() => result.current.setFormat(format))
      act(() => call(result.current, setter, value))
      expect(result.current[field]).toBe(value)
      expect(result.current.error).toBe(false)
      expect(result.current.password).toBe(generateSpy.mock.results.at(-1)!.value)
    }
  })
})

const RACES = SETTERS.flatMap((row) => (['resolve', 'reject'] as const).map((outcome) => [...row, outcome] as const))

describe('usePyrgus — option changes, clipboard and failures', () => {
  it.each(RACES)('ignores a delayed copy after an option change (%s on %s, %s = %j, write %s)', async (...args) => {
    const [setter, format, , value, outcome] = args
    let resolveWrite!: () => void
    let rejectWrite!: (reason: Error) => void
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve, reject) => {
          resolveWrite = resolve
          rejectWrite = reject
        }),
    )
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat(format))
    let pendingCopy!: Promise<void>
    act(() => {
      pendingCopy = result.current.copy()
    })
    act(() => call(result.current, setter, value))
    const currentPassword = result.current.password
    await act(async () => {
      if (outcome === 'resolve') resolveWrite()
      else rejectWrite(new Error('denied'))
      await pendingCopy
    })
    expect(result.current.password).toBe(currentPassword)
    expect(result.current).toMatchObject({ copied: false, copyFailed: false, announcement: 'New password generated' })
  })

  it.each(SETTERS)('keeps the clear of an already copied secret armed after %s', async (...args) => {
    const [setter, format, , value] = args
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat(format))
    await act(() => result.current.copy())
    expect(clipboardText).toBe(result.current.password)
    act(() => call(result.current, setter, value))
    expect(result.current.copied).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    })
    expect(writeText).toHaveBeenCalledWith('')
    expect(clipboardText).toBe('')
  })

  const FAILURES = SETTERS.flatMap((row) => (['succeeded', 'failed'] as const).map((copy) => [...row, copy] as const))

  it.each(FAILURES)(
    'fails closed when generation throws after a setting changes (%s on %s, %s = %j, prior copy %s)',
    async (...args) => {
      const [setter, format, field, value, priorCopy] = args
      if (priorCopy === 'failed') writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
      const { result } = renderHook(() => usePyrgus())
      act(() => result.current.setFormat(format))
      await act(() => result.current.copy())
      expect(priorCopy === 'succeeded' ? result.current.copied : result.current.copyFailed).toBe(true)

      generateSpy.mockImplementationOnce(() => {
        throw new InsecureRandomError('crypto.getRandomValues failed')
      })
      act(() => call(result.current, setter, value))
      expect(result.current).toMatchObject({ password: null, error: true, copied: false, copyFailed: false })

      generateSpy.mockClear()
      act(() => call(result.current, setter, OTHER_VALUE[field]))
      expect(result.current.error).toBe(false)
      expect(generateSpy).toHaveBeenLastCalledWith(format, { ...DEFAULT_OPTIONS, [field]: OTHER_VALUE[field] })
      expect(result.current.password).toBe(generateSpy.mock.results.at(-1)!.value)
    },
  )
})
