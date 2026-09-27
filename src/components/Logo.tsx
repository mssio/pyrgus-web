export function Logo(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <g className="fill-indigo-600 dark:fill-indigo-400">
        <path d="M15 15C12 7 5 3 3 6s1 9 12 10Z" />
        <path d="M17 15c3-8 10-12 12-9s-1 9-12 10Z" />
        <path d="M15 17c-8 1-11 5-9 8s7 0 9-7Z" />
        <path d="M17 17c8 1 11 5 9 8s-7 0-9-7Z" />
      </g>
      <rect x="15" y="9" width="2" height="16" rx="1" className="fill-zinc-900 dark:fill-white" />
    </svg>
  )
}
