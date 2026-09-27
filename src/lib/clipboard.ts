export const CLEAR_AFTER_MS = 90_000

let pendingClear: ReturnType<typeof setTimeout> | undefined
let copyVersion = 0

/**
 * Copies a secret and, 90 s later, clears the clipboard only if this tab has focus and the clipboard
 * still holds exactly that secret. Browsers have no clipboard-expiry API, so this is best effort.
 * Rejects if the write fails; in that case nothing is scheduled.
 */
export async function copySecret(secret: string): Promise<void> {
  // Invalidate an older timer/read immediately, even while this write is pending.
  cancelPendingClear()
  const version = copyVersion
  await navigator.clipboard.writeText(secret)
  if (version !== copyVersion) return
  pendingClear = setTimeout(() => {
    pendingClear = undefined
    void clearIfUnchanged(secret, version)
  }, CLEAR_AFTER_MS)
}

export function cancelPendingClear(): void {
  copyVersion++ // Invalidates in-flight reads and writes as well as scheduled timers.
  if (pendingClear !== undefined) clearTimeout(pendingClear)
  pendingClear = undefined
}

async function clearIfUnchanged(secret: string, version: number): Promise<void> {
  if (version !== copyVersion || !document.hasFocus()) return
  try {
    const current = await navigator.clipboard.readText()
    if (version !== copyVersion || !document.hasFocus() || current !== secret) return
    await navigator.clipboard.writeText('')
  } catch {
    // Read refused (e.g. Safari): never clear what we cannot verify.
  }
}
