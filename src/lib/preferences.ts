import {
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  isFormatId,
  isPinLength,
  type FormatId,
  type PinLength,
} from '../core/formats'

// Only these two preferences are ever stored. A generated secret is never persisted.
export const FORMAT_KEY = 'pyrgus.format'
export const PIN_LENGTH_KEY = 'pyrgus.pinLength'

export function readFormat(): FormatId {
  const value = read(FORMAT_KEY)
  return isFormatId(value) ? value : DEFAULT_FORMAT
}

export function readPinLength(): PinLength {
  const raw = read(PIN_LENGTH_KEY)
  const value = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null
  return isPinLength(value) ? value : DEFAULT_OPTIONS.pinLength
}

export function writeFormat(id: FormatId): void {
  write(FORMAT_KEY, id)
}

export function writePinLength(n: PinLength): void {
  write(PIN_LENGTH_KEY, String(n))
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
