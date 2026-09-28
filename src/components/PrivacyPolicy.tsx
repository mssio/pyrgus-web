import { APPLE_PRIVACY_URL, PRIVACY_EFFECTIVE_DATE, PRIVACY_EMAIL, REPO_URL, VERCEL_PRIVACY_URL } from '../config'
import { Heading, Subheading } from './catalyst/heading'
import { Strong, Text, TextLink } from './catalyst/text'

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-3 pl-5 text-base/6 text-zinc-500 marker:text-zinc-400 sm:text-sm/6 dark:text-zinc-400 dark:marker:text-zinc-500">
      {children}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <Subheading>{title}</Subheading>
      {children}
    </section>
  )
}

export function PrivacyPolicy() {
  return (
    <article>
      <Heading>Privacy Policy</Heading>
      <Text className="mt-2">Effective {PRIVACY_EFFECTIVE_DATE}</Text>

      <Text className="mt-6">
        <Strong>In short:</Strong> Pyrgus generates passwords and secret keys on your device. It has no accounts, no
        analytics, no advertising and no tracking. We never see, receive or store the passwords you generate.
      </Text>
      <Text className="mt-4">
        Pyrgus is made by mss.io. This policy covers Pyrgus Web (p.mss.io) and the Pyrgus app for iPhone, iPad and Mac.
      </Text>

      <Section title="Pyrgus Web">
        <List>
          <li>
            <Strong>Generation happens in your browser</Strong>, using its built-in secure random number generator. The
            page's security policy blocks it from making network requests, so a generated password cannot be sent
            anywhere.
          </li>
          <li>
            <Strong>What your browser stores:</Strong> two preferences in local storage, your chosen format and PIN
            length. Other options reset when you reload. Clearing this site's data in your browser removes them.
          </li>
          <li>
            <Strong>Clipboard:</Strong> when you copy a password, the page checks after 90 seconds whether the clipboard
            still holds it. If it does, the page clears it. Your browser may ask for permission to read the clipboard
            for this check, and you can decline. The page never changes anything you copied yourself afterwards.
          </li>
          <li>
            <Strong>Hosting:</Strong> the site is hosted by Vercel. Like any web server, Vercel receives standard
            request information when your browser loads the page: IP address, browser type, the page requested and the
            time. It handles that under <TextLink href={VERCEL_PRIVACY_URL}>Vercel's privacy policy</TextLink>. We add
            no analytics, cookies or third-party scripts, and all fonts and images come from p.mss.io itself.
          </li>
          <li>
            <Strong>Links out:</Strong> the EFF wordlist and source code links lead to other sites, which have their own
            policies.
          </li>
        </List>
      </Section>

      <Section title="Pyrgus for iPhone, iPad and Mac">
        <List>
          <li>
            <Strong>Generation happens on your device</Strong> with Apple's secure random number generator. The app
            makes no network connections and has no account.
          </li>
          <li>
            <Strong>What the app stores, on your device only:</Strong> your chosen format and its options. The Home
            Screen widget keeps its own settings and a timestamp of your last copy, so it can show "Copied" for 90
            seconds. Generated passwords are never stored. Deleting the app removes all of this.
          </li>
          <li>
            <Strong>Clipboard:</Strong> a copied password expires from the clipboard after 90 seconds. On iPhone and
            iPad the system does this for us. On Mac the app clears the clipboard only if you haven't copied something
            else since, and it marks the entry so clipboard-history tools don't record it. If you use Universal
            Clipboard, Apple syncs the clipboard between your own devices.
          </li>
          <li>
            <Strong>Apple:</Strong> Apple handles App Store downloads, and any crash reports you choose to share with
            developers, under <TextLink href={APPLE_PRIVACY_URL}>Apple's privacy policy</TextLink>. The app contains no
            third-party code that collects data.
          </li>
        </List>
      </Section>

      <Section title="Children">
        <Text className="mt-3">Pyrgus collects no personal information from anyone, including children.</Text>
      </Section>

      <Section title="Changes">
        <Text className="mt-3">
          If this policy changes, we'll update the effective date above. Past versions are kept in the{' '}
          <TextLink href={REPO_URL}>public source repository</TextLink>.
        </Text>
      </Section>

      <Section title="Contact">
        <Text className="mt-3">
          <TextLink href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</TextLink>
        </Text>
      </Section>
    </article>
  )
}
