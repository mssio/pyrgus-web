import { REPO_URL } from '../config'
import { GitHubIcon } from './icons'
import { Logo } from './Logo'

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
      <a href="/" className="flex items-center gap-2 text-zinc-950 dark:text-white">
        <Logo className="size-8" />
        <span className="text-lg font-semibold tracking-tight">Pyrgus</span>
      </a>
      <a
        href={REPO_URL}
        aria-label="Source code on GitHub"
        className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
      >
        <GitHubIcon className="size-6" />
      </a>
    </header>
  )
}
