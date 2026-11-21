import clsx from 'clsx'
import appIcon from '../assets/app-icon.png'

export function Logo({ className, ...props }: Omit<React.ComponentPropsWithoutRef<'img'>, 'src' | 'alt'>) {
  return (
    <img
      src={appIcon}
      alt=""
      aria-hidden="true"
      width={128}
      height={128}
      decoding="async"
      className={clsx('shrink-0 object-cover ring-1 ring-zinc-950/10 dark:ring-white/15', className)}
      {...props}
    />
  )
}
