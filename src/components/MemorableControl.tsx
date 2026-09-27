import { Radio, RadioGroup } from '@headlessui/react'
import { useId } from 'react'
import { MEMORABLE_SEPARATORS, MEMORABLE_WORD_COUNT_RANGE, type MemorableSeparator } from '../core/formats'

const SEPARATOR_LABELS: Record<MemorableSeparator, string> = {
  ' ': 'Space',
  '-': 'Hyphen (-)',
  _: 'Underscore (_)',
}

export function MemorableControl({
  wordCount,
  separator,
  onWordCountChange,
  onSeparatorChange,
}: {
  wordCount: number
  separator: MemorableSeparator
  onWordCountChange(n: number): void
  onSeparatorChange(value: MemorableSeparator): void
}) {
  const id = useId()
  return (
    <div className="mt-5 space-y-4">
      <div>
        <label htmlFor={`${id}-slider`} className="text-sm/6 font-medium text-zinc-950 dark:text-white">
          Words: {wordCount}
        </label>
        {/* Native range: it owns arrows and Home/End. The accessible name stays stable; the value is in valuetext. */}
        <input
          id={`${id}-slider`}
          type="range"
          min={MEMORABLE_WORD_COUNT_RANGE.min}
          max={MEMORABLE_WORD_COUNT_RANGE.max}
          step={1}
          value={wordCount}
          aria-label="Words"
          aria-valuetext={`${wordCount} words`}
          onChange={(event) => onWordCountChange(Number(event.currentTarget.value))}
          className="mt-2 block w-full cursor-pointer accent-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:accent-indigo-500"
        />
        <div aria-hidden="true" className="mt-1 flex justify-between text-xs/5 text-zinc-500 dark:text-zinc-400">
          <span>{MEMORABLE_WORD_COUNT_RANGE.min}</span>
          <span>{MEMORABLE_WORD_COUNT_RANGE.max}</span>
        </div>
      </div>
      <div>
        {/* Headless UI's RadioGroup drops aria-labelledby, so the group carries the name itself. */}
        <span aria-hidden="true" className="text-sm/6 font-medium text-zinc-950 dark:text-white">
          Separator
        </span>
        {/* One column on phones so the longer labels never overflow; three segments from 640 px. */}
        <RadioGroup
          value={separator}
          onChange={onSeparatorChange}
          aria-label="Separator"
          className="mt-2 grid grid-cols-1 gap-0.5 rounded-lg bg-zinc-950/5 p-0.5 sm:grid-cols-3 dark:bg-white/5"
        >
          {MEMORABLE_SEPARATORS.map((value) => (
            <Radio
              key={value}
              value={value}
              className="cursor-default rounded-md px-3 py-1 text-center text-sm/6 font-medium text-zinc-600 data-checked:bg-white data-checked:text-zinc-950 data-checked:shadow-sm data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500 dark:text-zinc-400 dark:data-checked:bg-zinc-700 dark:data-checked:text-white"
            >
              {SEPARATOR_LABELS[value]}
            </Radio>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
