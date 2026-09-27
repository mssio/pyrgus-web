import { DIGITS, LOWER, STANDARD_DIGITS, STANDARD_LOWER, STANDARD_UPPER, STRONG_BASE, SYMBOLS, UPPER } from './charsets'

export type FormatId = 'standard' | 'strong' | 'memorable' | 'pin' | 'secret128' | 'secret256'
export type PinLength = 4 | 6 | 8
export type Options = { pinLength: PinLength }

export type CharacterSpec = {
  kind: 'chars'
  length: number
  base: string
  /** One character from each set is placed at a distinct, uniformly chosen position. */
  required: readonly string[]
  groupSize?: number
  separator?: string
}
export type WordSpec = { kind: 'words'; wordCount: 4; suffixDigits: 2; separator: '-' }
export type HexSpec = { kind: 'hex'; byteCount: 16 | 32 }
export type FormatSpec = CharacterSpec | WordSpec | HexSpec

export const FORMAT_IDS: readonly FormatId[] = ['standard', 'strong', 'memorable', 'pin', 'secret128', 'secret256']
export const PIN_LENGTHS: readonly PinLength[] = [4, 6, 8]
export const DEFAULT_FORMAT: FormatId = 'standard'
export const DEFAULT_OPTIONS: Options = { pinLength: 6 }

export const FORMAT_LABELS: Record<FormatId, string> = {
  standard: 'Standard',
  strong: 'Strong',
  memorable: 'Memorable',
  pin: 'PIN',
  secret128: 'Secret 128',
  secret256: 'Secret 256',
}

export const FORMAT_GROUPS: readonly { heading: string; ids: readonly FormatId[] }[] = [
  { heading: 'Passwords', ids: ['standard', 'strong', 'memorable', 'pin'] },
  { heading: 'Secrets', ids: ['secret128', 'secret256'] },
]

/** The presets, as data. Adding a format is a new entry here, not a new code path. */
const SPECS: Record<FormatId, (options: Options) => FormatSpec> = {
  standard: () => ({
    kind: 'chars',
    length: 18,
    base: STANDARD_LOWER,
    required: [STANDARD_UPPER, STANDARD_DIGITS],
    groupSize: 6,
    separator: '-',
  }),
  strong: () => ({ kind: 'chars', length: 24, base: STRONG_BASE, required: [LOWER, UPPER, DIGITS, SYMBOLS] }),
  memorable: () => ({ kind: 'words', wordCount: 4, suffixDigits: 2, separator: '-' }),
  pin: ({ pinLength }) => ({ kind: 'chars', length: pinLength, base: DIGITS, required: [] }),
  secret128: () => ({ kind: 'hex', byteCount: 16 }),
  secret256: () => ({ kind: 'hex', byteCount: 32 }),
}

export function formatSpec(id: FormatId, options: Options): FormatSpec {
  return SPECS[id](options)
}

export function isFormatId(value: unknown): value is FormatId {
  return typeof value === 'string' && (FORMAT_IDS as readonly string[]).includes(value)
}

export function isPinLength(value: unknown): value is PinLength {
  return typeof value === 'number' && (PIN_LENGTHS as readonly number[]).includes(value)
}
