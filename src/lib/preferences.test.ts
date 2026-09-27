// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FORMAT_KEY, PIN_LENGTH_KEY, readFormat, readPinLength, writeFormat, writePinLength } from './preferences'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('preferences', () => {
  it('defaults to Password and 6 when nothing is stored', () => {
    expect(readFormat()).toBe('standard')
    expect(readPinLength()).toBe(6)
  })

  it('round-trips valid values', () => {
    writeFormat('secret256')
    writePinLength(8)
    expect(localStorage.getItem(FORMAT_KEY)).toBe('secret256')
    expect(localStorage.getItem(PIN_LENGTH_KEY)).toBe('8')
    expect(readFormat()).toBe('secret256')
    expect(readPinLength()).toBe(8)
  })

  it.each(['standard', 'strong', 'memorable'])('restores saved %s', (id) => {
    localStorage.setItem(FORMAT_KEY, id)
    expect(readFormat()).toBe(id)
  })

  it.each(['', 'Standard', 'secret512', '{"x":1}'])('ignores a junk format %j', (value) => {
    localStorage.setItem(FORMAT_KEY, value)
    expect(readFormat()).toBe('standard')
  })

  it.each(['', '5', '6.0x', 'eight', '-4'])('ignores a junk PIN length %j', (value) => {
    localStorage.setItem(PIN_LENGTH_KEY, value)
    expect(readPinLength()).toBe(6)
  })

  it('falls back to defaults when storage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(readFormat()).toBe('standard')
    expect(readPinLength()).toBe(6)
  })

  it('swallows errors when storage throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => writeFormat('pin')).not.toThrow()
    expect(() => writePinLength(4)).not.toThrow()
  })
})
