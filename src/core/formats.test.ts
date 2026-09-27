import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  FORMAT_GROUPS,
  FORMAT_IDS,
  FORMAT_LABELS,
  PIN_LENGTHS,
  formatSpec,
  isFormatId,
  isPinLength,
} from './formats'

describe('formats', () => {
  it('lists six formats with Standard as the default', () => {
    expect(FORMAT_IDS).toEqual(['standard', 'strong', 'memorable', 'pin', 'secret128', 'secret256'])
    expect(DEFAULT_FORMAT).toBe('standard')
    expect(DEFAULT_OPTIONS).toEqual({ pinLength: 6 })
  })

  it('groups every format exactly once under Passwords and Secrets', () => {
    expect(FORMAT_GROUPS.map((g) => g.heading)).toEqual(['Passwords', 'Secrets'])
    expect(FORMAT_GROUPS.flatMap((g) => g.ids)).toEqual([...FORMAT_IDS])
  })

  it('labels every format', () => {
    expect(FORMAT_LABELS).toEqual({
      standard: 'Standard',
      strong: 'Strong',
      memorable: 'Memorable',
      pin: 'PIN',
      secret128: 'Secret 128',
      secret256: 'Secret 256',
    })
  })

  it('only PIN reads the options', () => {
    for (const id of FORMAT_IDS) {
      if (id === 'pin') continue
      expect(formatSpec(id, { pinLength: 4 })).toEqual(formatSpec(id, { pinLength: 8 }))
    }
    for (const pinLength of PIN_LENGTHS) {
      expect(formatSpec('pin', { pinLength })).toMatchObject({ kind: 'chars', length: pinLength, required: [] })
    }
  })

  it('describes Standard and the Secrets as documented', () => {
    expect(formatSpec('standard', DEFAULT_OPTIONS)).toMatchObject({
      kind: 'chars',
      length: 18,
      groupSize: 6,
      separator: '-',
    })
    expect(formatSpec('secret128', DEFAULT_OPTIONS)).toEqual({ kind: 'hex', byteCount: 16 })
    expect(formatSpec('secret256', DEFAULT_OPTIONS)).toEqual({ kind: 'hex', byteCount: 32 })
  })

  it('guards stored values', () => {
    expect(isFormatId('secret256')).toBe(true)
    for (const bad of ['', 'Standard', 'secret512', null, undefined, 6]) expect(isFormatId(bad)).toBe(false)
    expect(PIN_LENGTHS.every(isPinLength)).toBe(true)
    for (const bad of [0, 5, 7, '6', NaN, null]) expect(isPinLength(bad)).toBe(false)
  })
})
