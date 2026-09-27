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
 * correctness bug. The visual value is aria-hidden; screen readers get the spelled form instead.
 */
export function SecretDisplay({ value, onCopy }: { value: string; onCopy: () => void }) {
  return (
    <div className="mt-6">
      <p
        data-testid="secret"
        aria-hidden="true"
        title="Click to copy"
        onClick={onCopy}
        className="cursor-pointer font-mono text-2xl/9 font-medium tracking-wide wrap-anywhere text-zinc-950 select-all dark:text-white"
      >
        <SecretText value={value} />
      </p>
      <p className="sr-only">Generated password: {spell(value)}</p>
    </div>
  )
}
