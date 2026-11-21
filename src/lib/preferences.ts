import {
  CUSTOM_LENGTH_RANGE,
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  MEMORABLE_SEPARATORS,
  MEMORABLE_WORD_COUNT_RANGE,
  isFormatId,
  isPinLength,
  type FormatId,
  type MemorableSeparator,
  type PinLength,
} from '../core/formats'

// Only these six preferences are ever stored. A generated secret is never persisted.
export const FORMAT_KEY = 'pyrgus.format'
export const PIN_LENGTH_KEY = 'pyrgus.pinLength'
export const CUSTOM_LENGTH_KEY = 'pyrgus.customLength'
export const INCLUDE_SYMBOLS_KEY = 'pyrgus.includeSymbols'
export const MEMORABLE_WORD_COUNT_KEY = 'pyrgus.memorableWordCount'
export const MEMORABLE_SEPARATOR_KEY = 'pyrgus.memorableSeparator'

const CANONICAL_POSITIVE_INT = /^[1-9]\d*$/

function readPositiveInt(key: string): number | null {
  const raw = read(key)
  return raw !== null && CANONICAL_POSITIVE_INT.test(raw) ? Number(raw) : null
}

export function readFormat(): FormatId {
  const value = read(FORMAT_KEY)
  return isFormatId(value) ? value : DEFAULT_FORMAT
}

export function readPinLength(): PinLength {
  const value = readPositiveInt(PIN_LENGTH_KEY)
  return isPinLength(value) ? value : DEFAULT_OPTIONS.pinLength
}

export function readCustomLength(): number {
  const value = readPositiveInt(CUSTOM_LENGTH_KEY)
  return value !== null && value >= CUSTOM_LENGTH_RANGE.min && value <= CUSTOM_LENGTH_RANGE.max
    ? value
    : DEFAULT_OPTIONS.customLength
}

export function readIncludeSymbols(): boolean {
  const value = read(INCLUDE_SYMBOLS_KEY)
  if (value === 'true') return true
  if (value === 'false') return false
  return DEFAULT_OPTIONS.includeSymbols
}

export function readMemorableWordCount(): number {
  const value = readPositiveInt(MEMORABLE_WORD_COUNT_KEY)
  return value !== null && value >= MEMORABLE_WORD_COUNT_RANGE.min && value <= MEMORABLE_WORD_COUNT_RANGE.max
    ? value
    : DEFAULT_OPTIONS.memorableWordCount
}

export function readMemorableSeparator(): MemorableSeparator {
  const value = read(MEMORABLE_SEPARATOR_KEY)
  return value !== null && (MEMORABLE_SEPARATORS as readonly string[]).includes(value)
    ? (value as MemorableSeparator)
    : DEFAULT_OPTIONS.memorableSeparator
}

export function writeFormat(id: FormatId): void {
  write(FORMAT_KEY, id)
}

export function writePinLength(n: PinLength): void {
  write(PIN_LENGTH_KEY, String(n))
}

export function writeCustomLength(n: number): void {
  write(CUSTOM_LENGTH_KEY, String(n))
}

export function writeIncludeSymbols(value: boolean): void {
  write(INCLUDE_SYMBOLS_KEY, String(value))
}

export function writeMemorableWordCount(n: number): void {
  write(MEMORABLE_WORD_COUNT_KEY, String(n))
}

export function writeMemorableSeparator(value: MemorableSeparator): void {
  write(MEMORABLE_SEPARATOR_KEY, value)
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // Storage blocked: behave as if nothing is stored.
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked or full: the preference is simply not remembered.
  }
}
