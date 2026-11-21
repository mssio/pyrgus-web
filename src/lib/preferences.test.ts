// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CUSTOM_LENGTH_KEY,
  FORMAT_KEY,
  INCLUDE_SYMBOLS_KEY,
  MEMORABLE_SEPARATOR_KEY,
  MEMORABLE_WORD_COUNT_KEY,
  PIN_LENGTH_KEY,
  readCustomLength,
  readFormat,
  readIncludeSymbols,
  readMemorableSeparator,
  readMemorableWordCount,
  readPinLength,
  writeCustomLength,
  writeFormat,
  writeIncludeSymbols,
  writeMemorableSeparator,
  writeMemorableWordCount,
  writePinLength,
} from './preferences'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('preferences', () => {
  it('defaults to Password and default options when nothing is stored', () => {
    expect(readFormat()).toBe('standard')
    expect(readPinLength()).toBe(6)
    expect(readCustomLength()).toBe(24)
    expect(readIncludeSymbols()).toBe(true)
    expect(readMemorableWordCount()).toBe(6)
    expect(readMemorableSeparator()).toBe('-')
  })

  it('round-trips valid values including boundaries', () => {
    writeFormat('secret256')
    writePinLength(8)
    writeCustomLength(6)
    writeIncludeSymbols(false)
    writeMemorableWordCount(8)
    writeMemorableSeparator(' ')
    expect(localStorage.getItem(FORMAT_KEY)).toBe('secret256')
    expect(localStorage.getItem(PIN_LENGTH_KEY)).toBe('8')
    expect(localStorage.getItem(CUSTOM_LENGTH_KEY)).toBe('6')
    expect(localStorage.getItem(INCLUDE_SYMBOLS_KEY)).toBe('false')
    expect(localStorage.getItem(MEMORABLE_WORD_COUNT_KEY)).toBe('8')
    expect(localStorage.getItem(MEMORABLE_SEPARATOR_KEY)).toBe(' ')
    expect(readFormat()).toBe('secret256')
    expect(readPinLength()).toBe(8)
    expect(readCustomLength()).toBe(6)
    expect(readIncludeSymbols()).toBe(false)
    expect(readMemorableWordCount()).toBe(8)
    expect(readMemorableSeparator()).toBe(' ')

    writeCustomLength(32)
    writeIncludeSymbols(true)
    writeMemorableWordCount(4)
    writeMemorableSeparator('_')
    expect(readCustomLength()).toBe(32)
    expect(readIncludeSymbols()).toBe(true)
    expect(readMemorableWordCount()).toBe(4)
    expect(readMemorableSeparator()).toBe('_')
  })

  it.each(['standard', 'strong', 'memorable'])('restores saved %s', (id) => {
    localStorage.setItem(FORMAT_KEY, id)
    expect(readFormat()).toBe(id)
  })

  it.each(['', 'Standard', 'secret512', '{"x":1}'])('ignores a junk format %j', (value) => {
    localStorage.setItem(FORMAT_KEY, value)
    expect(readFormat()).toBe('standard')
  })

  it.each(['', '5', '04', '06', '6.0x', 'eight', '-4'])('ignores a junk PIN length %j', (value) => {
    localStorage.setItem(PIN_LENGTH_KEY, value)
    expect(readPinLength()).toBe(6)
  })

  it.each(['', '5', '33', '06', '24.5', '6px', '-6', 'NaN'])('ignores a junk custom length %j', (value) => {
    localStorage.setItem(CUSTOM_LENGTH_KEY, value)
    expect(readCustomLength()).toBe(24)
  })

  it.each(['', '1', '0', 'yes', 'TRUE', 'False'])('ignores a junk includeSymbols %j', (value) => {
    localStorage.setItem(INCLUDE_SYMBOLS_KEY, value)
    expect(readIncludeSymbols()).toBe(true)
  })

  it.each(['', '3', '9', '04', '6.0', 'six'])('ignores a junk memorable word count %j', (value) => {
    localStorage.setItem(MEMORABLE_WORD_COUNT_KEY, value)
    expect(readMemorableWordCount()).toBe(6)
  })

  it.each(['', '  ', '--', ',', 'space'])('ignores a junk memorable separator %j', (value) => {
    localStorage.setItem(MEMORABLE_SEPARATOR_KEY, value)
    expect(readMemorableSeparator()).toBe('-')
  })

  it('falls back to defaults when storage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(readFormat()).toBe('standard')
    expect(readPinLength()).toBe(6)
    expect(readCustomLength()).toBe(24)
    expect(readIncludeSymbols()).toBe(true)
    expect(readMemorableWordCount()).toBe(6)
    expect(readMemorableSeparator()).toBe('-')
  })

  it('swallows errors when storage throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => writeFormat('pin')).not.toThrow()
    expect(() => writePinLength(4)).not.toThrow()
    expect(() => writeCustomLength(12)).not.toThrow()
    expect(() => writeIncludeSymbols(false)).not.toThrow()
    expect(() => writeMemorableWordCount(5)).not.toThrow()
    expect(() => writeMemorableSeparator(' ')).not.toThrow()
  })
})
