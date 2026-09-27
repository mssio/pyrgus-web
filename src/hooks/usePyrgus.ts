import { useEffect, useRef, useState } from 'react'
import { formatEntropy } from '../core/entropy'
import { DEFAULT_OPTIONS, type FormatId, type MemorableSeparator, type Options, type PinLength } from '../core/formats'
import { generate } from '../core/generate'
import { copySecret } from '../lib/clipboard'
import { readFormat, readPinLength, writeFormat, writePinLength } from '../lib/preferences'

export const COPIED_MS = 2000

export type Pyrgus = {
  format: FormatId
  pinLength: PinLength
  // Custom Password and Memorable options live in page state only: they reset on reload.
  customLength: number
  includeSymbols: boolean
  memorableWordCount: number
  memorableSeparator: MemorableSeparator
  /** null means secure randomness is unavailable: the UI shows the error state. */
  password: string | null
  error: boolean
  entropy: string
  copied: boolean
  copyFailed: boolean
  announcement: string
  /** Bumps on every announcement, including a repeat of the same text, so it can key a DOM replacement. */
  announcementId: number
  setFormat(id: FormatId): void
  setPinLength(n: PinLength): void
  setCustomLength(n: number): void
  setIncludeSymbols(value: boolean): void
  setMemorableWordCount(n: number): void
  setMemorableSeparator(value: MemorableSeparator): void
  regenerate(): void
  copy(): Promise<void>
}

/** Fail closed: any generation error yields no password, never a fallback. */
function tryGenerate(format: FormatId, options: Options): string | null {
  try {
    return generate(format, options)
  } catch {
    return null
  }
}

export function usePyrgus(): Pyrgus {
  const [format, setFormatState] = useState<FormatId>(readFormat)
  const [pinLength, setPinLengthState] = useState<PinLength>(readPinLength)
  const [customLength, setCustomLengthState] = useState(DEFAULT_OPTIONS.customLength)
  const [includeSymbols, setIncludeSymbolsState] = useState(DEFAULT_OPTIONS.includeSymbols)
  const [memorableWordCount, setMemorableWordCountState] = useState(DEFAULT_OPTIONS.memorableWordCount)
  const [memorableSeparator, setMemorableSeparatorState] = useState(DEFAULT_OPTIONS.memorableSeparator)
  const options: Options = { pinLength, customLength, includeSymbols, memorableWordCount, memorableSeparator }
  const [password, setPassword] = useState<string | null>(() => tryGenerate(format, options))
  // 0 = not copied; each successful copy bumps it, restarting the 2 s timer.
  const [copiedId, setCopiedId] = useState(0)
  const [copyFailed, setCopyFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [announcementId, setAnnouncementId] = useState(0)
  const feedbackVersion = useRef(0)

  function announce(text: string) {
    setAnnouncement(text)
    setAnnouncementId((id) => id + 1)
  }

  useEffect(() => {
    if (copiedId === 0) return
    const timer = setTimeout(() => setCopiedId(0), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copiedId])

  function next(nextFormat: FormatId, nextOptions: Options) {
    feedbackVersion.current++
    setPassword(tryGenerate(nextFormat, nextOptions))
    setCopiedId(0)
    setCopyFailed(false)
    announce('New password generated')
  }

  function setFormat(id: FormatId) {
    setFormatState(id)
    writeFormat(id)
    next(id, options)
  }

  function setPinLength(n: PinLength) {
    setPinLengthState(n)
    writePinLength(n)
    next(format, { ...options, pinLength: n })
  }

  // The option setters ignore a no-op event, so it neither regenerates nor re-announces.
  function setCustomLength(n: number) {
    if (n === customLength) return
    setCustomLengthState(n)
    next(format, { ...options, customLength: n })
  }

  function setIncludeSymbols(value: boolean) {
    if (value === includeSymbols) return
    setIncludeSymbolsState(value)
    next(format, { ...options, includeSymbols: value })
  }

  function setMemorableWordCount(n: number) {
    if (n === memorableWordCount) return
    setMemorableWordCountState(n)
    next(format, { ...options, memorableWordCount: n })
  }

  function setMemorableSeparator(value: MemorableSeparator) {
    if (value === memorableSeparator) return
    setMemorableSeparatorState(value)
    next(format, { ...options, memorableSeparator: value })
  }

  async function copy() {
    if (password === null) return
    const version = ++feedbackVersion.current
    try {
      await copySecret(password)
      if (version !== feedbackVersion.current) return
      setCopyFailed(false)
      setCopiedId((id) => id + 1)
      announce('Copied')
    } catch {
      if (version !== feedbackVersion.current) return
      setCopiedId(0)
      setCopyFailed(true)
      announce('Copy failed')
    }
  }

  return {
    format,
    pinLength,
    customLength,
    includeSymbols,
    memorableWordCount,
    memorableSeparator,
    password,
    error: password === null,
    entropy: formatEntropy(format, options),
    copied: copiedId !== 0,
    copyFailed,
    announcement,
    announcementId,
    setFormat,
    setPinLength,
    setCustomLength,
    setIncludeSymbols,
    setMemorableWordCount,
    setMemorableSeparator,
    regenerate: () => next(format, options),
    copy,
  }
}
