import clsx from 'clsx'

/** The Home Screen widget never displays a secret: only a mask of its shape and "Copied". */
export function WidgetMockup({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'w-52 rounded-3xl bg-white/90 p-4 shadow-xl ring-1 ring-zinc-950/10 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10',
        className,
      )}
    >
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pyrgus</div>
      <div className="mt-3 font-mono text-xs tracking-tight whitespace-nowrap text-zinc-900 dark:text-white">
        ••••••-••••••-••••••
      </div>
      <div className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Copied ✓</div>
    </div>
  )
}
