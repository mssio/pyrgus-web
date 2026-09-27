import { EFF_WORDLIST_URL, REPO_URL } from '../config'
import { TextLink } from './catalyst/text'

export function Footer() {
  return (
    <footer className="border-t border-zinc-950/5 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-10 text-sm/6 text-zinc-500 sm:px-6 dark:text-zinc-400">
        <p>Passwords are generated in your browser and never leave it.</p>
        <p>
          Memorable passwords use the <TextLink href={EFF_WORDLIST_URL}>EFF long wordlist</TextLink> (CC BY 3.0 US).
        </p>
        <p>
          © 2026 mss.io · <TextLink href={REPO_URL}>Source code</TextLink>
        </p>
      </div>
    </footer>
  )
}
