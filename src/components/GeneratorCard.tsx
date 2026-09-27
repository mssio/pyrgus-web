import { usePyrgus } from '../hooks/usePyrgus'
import { Button } from './catalyst/button'
import { CustomPasswordControl } from './CustomPasswordControl'
import { FormatPicker } from './FormatPicker'
import { MemorableControl } from './MemorableControl'
import { PinLengthControl } from './PinLengthControl'
import { SecretDisplay } from './SecretDisplay'

export const RANDOMNESS_ERROR = "Your browser can't provide secure randomness, so Pyrgus won't generate a password."

export function GeneratorCard() {
  const p = usePyrgus()

  return (
    <section aria-labelledby="generator-heading" className="mx-auto w-full max-w-md px-4 sm:max-w-lg">
      <h1 id="generator-heading" className="sr-only">
        Pyrgus password generator
      </h1>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 sm:p-8 dark:bg-zinc-900 dark:ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormatPicker value={p.format} onChange={p.setFormat} />
          {p.format === 'pin' ? <PinLengthControl value={p.pinLength} onChange={p.setPinLength} /> : null}
        </div>
        {p.format === 'strong' ? (
          <CustomPasswordControl
            length={p.customLength}
            includeSymbols={p.includeSymbols}
            onLengthChange={p.setCustomLength}
            onIncludeSymbolsChange={p.setIncludeSymbols}
          />
        ) : null}
        {p.format === 'memorable' ? (
          <MemorableControl
            wordCount={p.memorableWordCount}
            separator={p.memorableSeparator}
            onWordCountChange={p.setMemorableWordCount}
            onSeparatorChange={p.setMemorableSeparator}
          />
        ) : null}

        {p.password === null ? (
          <p role="alert" className="mt-6 text-sm/6 font-medium text-red-600 dark:text-red-400">
            {RANDOMNESS_ERROR}
          </p>
        ) : (
          <>
            <SecretDisplay value={p.password} onCopy={() => void p.copy()} />
            <p className="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">{p.entropy} bits of entropy</p>
          </>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button color="indigo" disabled={p.error} onClick={() => void p.copy()}>
            {p.copied ? 'Copied ✓' : 'Copy'}
          </Button>
          <Button outline disabled={p.error} onClick={p.regenerate}>
            Regenerate
          </Button>
        </div>

        <p className="mt-3 text-xs/5 text-zinc-500 dark:text-zinc-400">
          {p.copyFailed
            ? "Couldn't copy. Select the password and copy it manually."
            : 'Clipboard clears in 90s while this tab is open.'}
        </p>
        {/*
          A fresh child node per announcement (even a repeat of the same text) so screen readers
          re-announce it: setting a live region's content to an unchanged string is not a DOM change.
        */}
        <p role="status" className="sr-only">
          <span key={p.announcementId}>{p.announcement}</span>
        </p>
      </div>
    </section>
  )
}
