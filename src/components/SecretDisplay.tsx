import { spell } from '../lib/spell'

/** The secret with digit runs highlighted in indigo (all formats, including hex). */
export function SecretText({ value }: { value: string }) {
  return value.split(/(\d+)/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-indigo-600 dark:text-indigo-400">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

/**
 * Wraps at any character and never truncates: a truncated secret that looks complete is a
 * correctness bug. Spaces are kept exactly (pre-wrap), so a copy or selection matches the value.
 * The visual value is aria-hidden; screen readers get the spelled form instead.
 */
export function SecretDisplay({ value, onCopy }: { value: string; onCopy: () => void }) {
  return (
    // translate="no": browser page translation would send the secret to the vendor's translation
    // service and could visibly rewrite a Memorable passphrase's words.
    <div className="mt-6" translate="no">
      <p
        data-testid="secret"
        aria-hidden="true"
        title="Click to copy"
        onClick={onCopy}
        className="cursor-pointer font-mono text-2xl/9 font-medium tracking-wide wrap-anywhere whitespace-pre-wrap text-zinc-950 select-all sm:text-3xl/10 dark:text-white"
      >
        <SecretText value={value} />
      </p>
      <p className="sr-only">Generated password: {spell(value)}</p>
    </div>
  )
}
