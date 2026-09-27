export const CLEAR_AFTER_MS = 90_000

type Armed = { secret: string; dueAt: number }

let pendingClear: ReturnType<typeof setTimeout> | undefined
let pendingFocusListener: (() => void) | undefined
let copyVersion = 0
/** The secret we still intend to clear (scheduled, or waiting for focus to retry), if any. */
let armed: Armed | undefined

/**
 * Copies a secret and, 90 s later, clears the clipboard only if this tab has focus and the clipboard
 * still holds exactly that secret. Browsers have no clipboard-expiry API, so this is best effort. If
 * the tab is unfocused when the 90 s mark is reached, the clear is retried the next time the tab
 * regains focus.
 *
 * Rejects if the write fails. In that case nothing new is scheduled, but if a previous secret still
 * had a clear pending, that clear is kept (or re-armed for its remaining time) rather than lost.
 */
export async function copySecret(secret: string): Promise<void> {
  const previous = armed
  cancelPendingClear()
  const version = copyVersion
  try {
    await navigator.clipboard.writeText(secret)
  } catch (err) {
    if (version === copyVersion && previous) rearm(previous, version)
    throw err
  }
  if (version !== copyVersion) return // Superseded while the write was in flight.
  const record: Armed = { secret, dueAt: Date.now() + CLEAR_AFTER_MS }
  armed = record
  scheduleFor(record, version)
}

/** Cancels any scheduled clear, in-flight retry or remembered secret. Invalidates stale reads/writes. */
export function cancelPendingClear(): void {
  copyVersion++
  if (pendingClear !== undefined) clearTimeout(pendingClear)
  pendingClear = undefined
  if (pendingFocusListener !== undefined) window.removeEventListener('focus', pendingFocusListener)
  pendingFocusListener = undefined
  armed = undefined
}

function rearm(record: Armed, version: number): void {
  armed = record
  scheduleFor(record, version)
}

function scheduleFor(record: Armed, version: number): void {
  const delay = Math.max(0, record.dueAt - Date.now())
  pendingClear = setTimeout(() => {
    pendingClear = undefined
    fire(record, version)
  }, delay)
}

function fire(record: Armed, version: number): void {
  if (version !== copyVersion) return
  if (!document.hasFocus()) {
    armFocusRetry(record, version)
    return
  }
  void attemptClear(record, version)
}

/** The clear didn't happen because the tab was unfocused; retry once, the next time it regains focus. */
function armFocusRetry(record: Armed, version: number): void {
  const onFocus = (): void => {
    window.removeEventListener('focus', onFocus)
    if (pendingFocusListener === onFocus) pendingFocusListener = undefined
    fire(record, version)
  }
  pendingFocusListener = onFocus
  window.addEventListener('focus', onFocus)
}

async function attemptClear(record: Armed, version: number): Promise<void> {
  try {
    const current = await navigator.clipboard.readText()
    if (version !== copyVersion || !document.hasFocus() || current !== record.secret) return
    await navigator.clipboard.writeText('')
    if (version === copyVersion) armed = undefined
  } catch {
    // Read refused (e.g. Safari): never clear what we cannot verify.
  }
}
