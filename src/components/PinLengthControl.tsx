import { Radio, RadioGroup } from '@headlessui/react'
import { PIN_LENGTHS, type PinLength } from '../core/formats'

export function PinLengthControl({ value, onChange }: { value: PinLength; onChange: (n: PinLength) => void }) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      aria-label="PIN length"
      className="inline-flex rounded-lg bg-zinc-950/5 p-0.5 dark:bg-white/5"
    >
      {PIN_LENGTHS.map((n) => (
        <Radio
          key={n}
          value={n}
          aria-label={`${n} digits`}
          className="cursor-default rounded-md px-3 py-1 text-sm/6 font-medium text-zinc-600 data-checked:bg-white data-checked:text-zinc-950 data-checked:shadow-sm data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500 dark:text-zinc-400 dark:data-checked:bg-zinc-700 dark:data-checked:text-white"
        >
          {n}
        </Radio>
      ))}
    </RadioGroup>
  )
}
