import { Field, Label, Switch } from '@headlessui/react'
import { useId } from 'react'
import { CUSTOM_LENGTH_RANGE } from '../core/formats'

export function CustomPasswordControl({
  length,
  includeSymbols,
  onLengthChange,
  onIncludeSymbolsChange,
}: {
  length: number
  includeSymbols: boolean
  onLengthChange(n: number): void
  onIncludeSymbolsChange(value: boolean): void
}) {
  const id = useId()
  return (
    <div className="mt-5 space-y-4">
      <div>
        <label htmlFor={`${id}-slider`} className="text-sm/6 font-medium text-zinc-950 dark:text-white">
          Length: {length}
        </label>
        {/* Native range: it owns arrows and Home/End. The accessible name stays stable; the value is in valuetext. */}
        <input
          id={`${id}-slider`}
          type="range"
          min={CUSTOM_LENGTH_RANGE.min}
          max={CUSTOM_LENGTH_RANGE.max}
          step={1}
          value={length}
          aria-label="Password length"
          aria-valuetext={`${length} characters`}
          onChange={(event) => onLengthChange(Number(event.currentTarget.value))}
          className="mt-2 block w-full cursor-pointer accent-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:accent-indigo-500"
        />
        <div aria-hidden="true" className="mt-1 flex justify-between text-xs/5 text-zinc-500 dark:text-zinc-400">
          <span>{CUSTOM_LENGTH_RANGE.min}</span>
          <span>{CUSTOM_LENGTH_RANGE.max}</span>
        </div>
      </div>
      <Field className="flex items-center justify-between gap-4">
        <Label className="text-sm/6 font-medium text-zinc-950 dark:text-white">Include symbols</Label>
        <Switch
          checked={includeSymbols}
          onChange={onIncludeSymbolsChange}
          className="group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-zinc-200 p-0.5 transition-colors data-checked:bg-indigo-600 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500 dark:bg-white/10 dark:data-checked:bg-indigo-500"
        >
          <span
            aria-hidden="true"
            className="size-5 rounded-full bg-white shadow-sm ring-1 ring-zinc-950/5 transition-transform group-data-checked:translate-x-5"
          />
        </Switch>
      </Field>
    </div>
  )
}
