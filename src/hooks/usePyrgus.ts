import { useEffect, useRef, useState } from 'react'
import { formatEntropy } from '../core/entropy'
import type { FormatId, PinLength } from '../core/formats'
import { generate } from '../core/generate'
import { copySecret } from '../lib/clipboard'
import { readFormat, readPinLength, writeFormat, writePinLength } from '../lib/preferences'

export const COPIED_MS = 2000

export type Pyrgus = {
  format: FormatId
  pinLength: PinLength
  /** null means secure randomness is unavailable: the UI shows the error state. */
  password: string | null
  error: boolean
  entropy: string
  copied: boolean
  copyFailed: boolean
  announcement: string
  setFormat(id: FormatId): void
  setPinLength(n: PinLength): void
  regenerate(): void
  copy(): Promise<void>
}

/** Fail closed: any generation error yields no password, never a fallback. */
function tryGenerate(format: FormatId, pinLength: PinLength): string | null {
  try {
    return generate(format, { pinLength })
  } catch {
    return null
  }
}

export function usePyrgus(): Pyrgus {
  const [format, setFormatState] = useState<FormatId>(readFormat)
  const [pinLength, setPinLengthState] = useState<PinLength>(readPinLength)
  const [password, setPassword] = useState<string | null>(() => tryGenerate(format, pinLength))
  // 0 = not copied; each successful copy bumps it, restarting the 2 s timer.
  const [copiedId, setCopiedId] = useState(0)
  const [copyFailed, setCopyFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const feedbackVersion = useRef(0)

  useEffect(() => {
    if (copiedId === 0) return
    const timer = setTimeout(() => setCopiedId(0), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copiedId])

  function next(nextFormat: FormatId, nextPinLength: PinLength) {
    feedbackVersion.current++
    setPassword(tryGenerate(nextFormat, nextPinLength))
    setCopiedId(0)
    setCopyFailed(false)
    setAnnouncement('New password generated')
  }

  function setFormat(id: FormatId) {
    setFormatState(id)
    writeFormat(id)
    next(id, pinLength)
  }

  function setPinLength(n: PinLength) {
    setPinLengthState(n)
    writePinLength(n)
    next(format, n)
  }

  async function copy() {
    if (password === null) return
    const version = ++feedbackVersion.current
    try {
      await copySecret(password)
      if (version !== feedbackVersion.current) return
      setCopyFailed(false)
      setCopiedId((id) => id + 1)
      setAnnouncement('Copied')
    } catch {
      if (version !== feedbackVersion.current) return
      setCopiedId(0)
      setCopyFailed(true)
      setAnnouncement('Copy failed')
    }
  }

  return {
    format,
    pinLength,
    password,
    error: password === null,
    entropy: formatEntropy(format, { pinLength }),
    copied: copiedId !== 0,
    copyFailed,
    announcement,
    setFormat,
    setPinLength,
    regenerate: () => next(format, pinLength),
    copy,
  }
}
