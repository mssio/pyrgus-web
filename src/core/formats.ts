import { DIGITS, LOWER, STANDARD_DIGITS, STANDARD_LOWER, STANDARD_UPPER, STRONG_BASE, SYMBOLS, UPPER } from './charsets'

export type FormatId = 'standard' | 'strong' | 'memorable' | 'pin' | 'secret128' | 'secret256'
export type PinLength = 4 | 6 | 8
export type MemorableSeparator = ' ' | '-' | '_'
export type Options = {
  pinLength: PinLength
  /** Custom Password: an integer from 6 through 32. */
  customLength: number
  /** Custom Password: whether symbols are in the alphabet and required. */
  includeSymbols: boolean
  /** Memorable: an integer from 4 through 8. */
  memorableWordCount: number
  memorableSeparator: MemorableSeparator
}

export type CharacterSpec = {
  kind: 'chars'
  length: number
  base: string
  /** One character from each set is placed at a distinct, uniformly chosen position. */
  required: readonly string[]
  groupSize?: number
  separator?: string
}
export type WordSpec = {
  kind: 'words'
  wordCount: number
  suffixDigits: 3
  separator: MemorableSeparator
  /** Uppercase the first letter of each entry; its own hyphens are kept. */
  capitalizeFirst: true
}
export type HexSpec = { kind: 'hex'; byteCount: 16 | 32 }
export type FormatSpec = CharacterSpec | WordSpec | HexSpec

export const FORMAT_IDS: readonly FormatId[] = ['standard', 'strong', 'memorable', 'pin', 'secret128', 'secret256']
export const PIN_LENGTHS: readonly PinLength[] = [4, 6, 8]
export const DEFAULT_FORMAT: FormatId = 'standard'
export const MEMORABLE_SEPARATORS: readonly MemorableSeparator[] = [' ', '-', '_']
export const CUSTOM_LENGTH_RANGE = { min: 6, max: 32 } as const
export const MEMORABLE_WORD_COUNT_RANGE = { min: 4, max: 8 } as const
export const DEFAULT_OPTIONS: Options = {
  pinLength: 6,
  customLength: 24,
  includeSymbols: true,
  memorableWordCount: 6,
  memorableSeparator: '-',
}

export const FORMAT_LABELS: Record<FormatId, string> = {
  standard: 'Password',
  strong: 'Custom Password',
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
  strong: ({ customLength, includeSymbols }) => {
    checkInteger('customLength', customLength, CUSTOM_LENGTH_RANGE)
    if (typeof includeSymbols !== 'boolean')
      throw new RangeError(`includeSymbols must be a boolean, got ${includeSymbols}`)
    return includeSymbols
      ? { kind: 'chars', length: customLength, base: STRONG_BASE, required: [LOWER, UPPER, DIGITS, SYMBOLS] }
      : { kind: 'chars', length: customLength, base: LOWER + UPPER + DIGITS, required: [LOWER, UPPER, DIGITS] }
  },
  memorable: ({ memorableWordCount, memorableSeparator }) => {
    checkInteger('memorableWordCount', memorableWordCount, MEMORABLE_WORD_COUNT_RANGE)
    if (!MEMORABLE_SEPARATORS.includes(memorableSeparator)) {
      throw new RangeError(`memorableSeparator must be one of ${JSON.stringify(MEMORABLE_SEPARATORS)}`)
    }
    return {
      kind: 'words',
      wordCount: memorableWordCount,
      suffixDigits: 3,
      separator: memorableSeparator,
      capitalizeFirst: true,
    }
  },
  pin: ({ pinLength }) => ({ kind: 'chars', length: pinLength, base: DIGITS, required: [] }),
  secret128: () => ({ kind: 'hex', byteCount: 16 }),
  secret256: () => ({ kind: 'hex', byteCount: 32 }),
}

/** Rejects rather than clamps or coerces: an invalid option must never reach the generator. */
function checkInteger(name: string, value: number, { min, max }: { min: number; max: number }): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} through ${max}, got ${value}`)
  }
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
