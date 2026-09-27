import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLEAR_AFTER_MS, cancelPendingClear, copySecret } from './clipboard'

let clipboardText: string
let focused: boolean
const writeText = vi.fn(async (text: string) => {
  clipboardText = text
})
const readText = vi.fn(async () => clipboardText)

beforeEach(() => {
  clipboardText = ''
  focused = true
  writeText.mockClear()
  readText.mockClear()
  vi.useFakeTimers()
  vi.stubGlobal('navigator', { clipboard: { writeText, readText } })
  vi.stubGlobal('document', { hasFocus: () => focused })
  // No jsdom here (environment: 'node'); a plain EventTarget is enough for window focus listeners.
  vi.stubGlobal('window', new EventTarget())
})

afterEach(() => {
  cancelPendingClear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  writeText.mockImplementation(async (text: string) => {
    clipboardText = text
  })
  readText.mockImplementation(async () => clipboardText)
})

describe('copySecret', () => {
  it('writes the secret to the clipboard', async () => {
    await copySecret('abc')
    expect(writeText).toHaveBeenCalledWith('abc')
  })

  it('clears after 90 s when focused and the clipboard still holds the secret', async () => {
    await copySecret('abc')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS - 1)
    expect(clipboardText).toBe('abc')
    await vi.advanceTimersByTimeAsync(1)
    expect(clipboardText).toBe('')
  })

  it('never clears something the user copied afterwards', async () => {
    await copySecret('abc')
    clipboardText = 'user copied this'
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(clipboardText).toBe('user copied this')
  })

  it('does not clear, or even read, while the tab is unfocused', async () => {
    await copySecret('abc')
    focused = false
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(readText).not.toHaveBeenCalled()
    expect(clipboardText).toBe('abc')
  })

  it('does nothing when the read is refused', async () => {
    readText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    await copySecret('abc')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(clipboardText).toBe('abc')
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('a newer copy cancels the older pending clear', async () => {
    await copySecret('first')
    await vi.advanceTimersByTimeAsync(60_000)
    await copySecret('second')
    await vi.advanceTimersByTimeAsync(30_000) // 90 s after the first copy
    expect(readText).not.toHaveBeenCalled()
    expect(clipboardText).toBe('second')
    await vi.advanceTimersByTimeAsync(60_000) // 90 s after the second copy
    expect(readText).toHaveBeenCalledTimes(1)
    expect(clipboardText).toBe('')
  })

  it('rejects, and schedules no clear, when the write is refused', async () => {
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    await expect(copySecret('abc')).rejects.toThrow('denied')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(readText).not.toHaveBeenCalled()
  })

  it.each(['new copy', 'cancel', 'blur'] as const)(
    'does not clear after %s occurs during a delayed read',
    async (action) => {
      let resolveRead!: (value: string) => void
      readText.mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveRead = resolve
          }),
      )
      await copySecret('old')
      await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
      expect(readText).toHaveBeenCalledTimes(1)

      if (action === 'new copy') await copySecret('new')
      else if (action === 'cancel') cancelPendingClear()
      else focused = false

      resolveRead('old') // Snapshot taken before the intervening action.
      await vi.advanceTimersByTimeAsync(0)
      expect(clipboardText).toBe(action === 'new copy' ? 'new' : 'old')
      expect(writeText).not.toHaveBeenCalledWith('')
    },
  )

  it('invalidates an in-flight clear as soon as a new write starts', async () => {
    let resolveRead!: (value: string) => void
    let resolveWrite!: () => void
    readText.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve
        }),
    )
    await copySecret('old')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve
        }),
    )
    const pendingCopy = copySecret('new')
    resolveRead('old')
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).not.toHaveBeenCalledWith('')
    clipboardText = 'new'
    resolveWrite()
    await pendingCopy
  })

  it('an older write completing late cannot replace the newer clear timer', async () => {
    let resolveWrite!: () => void
    // Delay acknowledgement of the first write; the clipboard already contains its value.
    writeText.mockImplementationOnce((text) => {
      clipboardText = text
      return new Promise<void>((resolve) => {
        resolveWrite = resolve
      })
    })
    const first = copySecret('first')
    await copySecret('second')
    await vi.advanceTimersByTimeAsync(1000)
    resolveWrite()
    await first
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS - 1000)
    expect(readText).toHaveBeenCalledTimes(1)
    expect(clipboardText).toBe('')
  })

  it('cancellation during a pending write prevents a later clear timer', async () => {
    let resolveWrite!: () => void
    writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve
        }),
    )
    const pendingCopy = copySecret('abc')
    cancelPendingClear()
    resolveWrite()
    await pendingCopy
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(readText).not.toHaveBeenCalled()
  })

  it('rejects when the Clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {})
    await expect(copySecret('abc')).rejects.toThrow()
  })

  describe('when a newer copy fails', () => {
    it("keeps the previous secret's clear and fires it at its original deadline", async () => {
      await copySecret('A')
      await vi.advanceTimersByTimeAsync(60_000)
      writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
      await expect(copySecret('B')).rejects.toThrow('denied')
      expect(clipboardText).toBe('A') // The rejected write never touched the clipboard.

      await vi.advanceTimersByTimeAsync(30_000 - 1) // 90 s after A's copy.
      expect(clipboardText).toBe('A')
      await vi.advanceTimersByTimeAsync(1)
      expect(clipboardText).toBe('')
    })

    it('an explicit cancel still cancels the re-armed clear', async () => {
      await copySecret('A')
      await vi.advanceTimersByTimeAsync(60_000)
      writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
      await expect(copySecret('B')).rejects.toThrow('denied')
      cancelPendingClear()

      await vi.advanceTimersByTimeAsync(30_000)
      expect(readText).not.toHaveBeenCalled()
      expect(clipboardText).toBe('A')
    })
  })

  describe('when the 90 s mark is reached while unfocused', () => {
    it('retries the guarded clear the next time the tab regains focus, once', async () => {
      await copySecret('abc')
      focused = false
      await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
      expect(readText).not.toHaveBeenCalled()
      expect(clipboardText).toBe('abc')

      focused = true
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
      expect(readText).toHaveBeenCalledTimes(1)
      expect(clipboardText).toBe('')

      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
      expect(readText).toHaveBeenCalledTimes(1) // The listener was one-shot.
    })

    it('a newer copy removes the stale focus listener; the new secret keeps its own timer', async () => {
      await copySecret('old')
      focused = false
      await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
      expect(readText).not.toHaveBeenCalled()

      await copySecret('new')
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
      expect(readText).not.toHaveBeenCalled() // The old listener is gone; focus alone clears nothing.
      expect(clipboardText).toBe('new')

      focused = true
      await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
      expect(readText).toHaveBeenCalledTimes(1)
      expect(clipboardText).toBe('')
    })
  })
})
