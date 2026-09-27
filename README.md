# Pyrgus

Strong passwords and secret keys, generated in your browser. **https://p.mss.io**

## How it keeps your secret safe

Every claim below points at the code or config that makes it true.

- **Generated in your browser** with `crypto.getRandomValues`, the operating system's secure random
  source. See [`src/core/random.ts`](src/core/random.ts).
- **Unbiased.** Characters are chosen by rejection sampling, never `x % n`, and required characters
  go to uniformly chosen positions. The chi-squared tests in [`src/core`](src/core) check this.
- **Fails closed.** If secure randomness is unavailable, no password is shown.
- **The page cannot make network requests.** `connect-src 'none'` in [`vercel.json`](vercel.json),
  alongside a strict CSP with Trusted Types.
- **No analytics, no third-party scripts, no CDN fonts.**
- **Nothing stored but your format preference.** Only `pyrgus.format` and `pyrgus.pinLength` go to
  `localStorage`; see [`src/lib/preferences.ts`](src/lib/preferences.ts). Custom Password and
  Memorable options last only for the page session and reset on reload.

**Limitations.** Clearing the clipboard after 90 s depends on the browser: it happens only while the
tab is open and focused, and only where the browser lets the page read the clipboard (Safari does
not). JavaScript strings cannot be wiped from memory. A compromised browser, operating system or
extension is out of scope.

## Formats

| Format          | Example                                | Entropy                           |
| --------------- | -------------------------------------- | --------------------------------- |
| Password        | `khduvn-xeRvpr-mzt7ai`                 | 90.1 bits                         |
| Custom Password | `k7$Rm2xPq!vLz9Wn#tBc4eYh`             | ~35 to ~199 bits (default ~149)   |
| Memorable       | `Vivid-Cobra-Mango-Drop-down-Lake-042` | 61.7 to 113.4 bits (default 87.5) |
| PIN (4 / 6 / 8) | `478210`                               | 13.3 / 19.9 / 26.6 bits           |
| Secret 128      | 32 hex characters                      | 128 bits                          |
| Secret 256      | 64 hex characters                      | 256 bits                          |

Password never uses the look-alike characters `l`, `O`, `I`, `0` or `1`.

**Custom Password** has a 6–32 character length slider and an Include symbols switch (default 24
characters, symbols on). It always contains a lowercase letter, an uppercase letter and a digit, plus
a symbol when symbols are on. Its entropy depends on the settings and is an approximate upper bound,
shown with `~` (`~149` at the default).

**Memorable** has a 4–8 word slider (default six) and a separator choice of space, hyphen or
underscore (default hyphen). Each word comes from the EFF long wordlist with its first letter
capitalized — entries such as `drop-down` keep their own hyphen — followed by a three-digit suffix
from `000` to `999`, all joined by the chosen separator. Its entropy is exact: 61.7, 74.6, 87.5, 100.4
or 113.4 bits for four to eight words, whatever the separator.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev        # dev server; the CSP is NOT applied here (HMR needs inline scripts)
npm run build      # type-check and build to dist/
npm run preview    # serve dist/ with the production security headers
npm run lint
npm run format
```

Rules for contributors and coding agents are in [`AGENTS.md`](AGENTS.md).

### Specs and plans

The design lives in [`docs/`](docs/). [`docs/2026-09-26-pyrgus-web-spec.md`](docs/2026-09-26-pyrgus-web-spec.md)
is the binding spec: it always describes the site as built. Each later change gets a dated pair,
`docs/YYYY-MM-DD-<topic>-spec.md` and `docs/YYYY-MM-DD-<topic>-plan.md`. The spec is approved before
the plan is written, and the binding spec is updated in the same commit as the code. The full rules
are in [`AGENTS.md`](AGENTS.md).

## Testing

```sh
npm test           # Vitest: generator shape, options, exclusions, uniformity, entropy, wordlist, UI
npm run test:e2e   # Playwright on the production build: zero CSP violations, keyboard, copy, 320 px layout
```

## Deployment

Vercel builds pull requests as previews and `main` as production. Security headers and the
`/generate` → `/` redirect live in [`vercel.json`](vercel.json).

## Pyrgus for iPhone, iPad & Mac

Coming soon.

## Credits and licences

- This project's code is [MIT](LICENSE)-licensed, **except** files derived from Tailwind Plus
  (`src/components/catalyst/`), which are under the
  [Tailwind Plus licence](https://tailwindcss.com/plus/license). See `LICENSE`.
- Memorable passwords use the [EFF long wordlist](https://www.eff.org/dice) (CC BY 3.0 US).
- [Inter](https://rsms.me/inter/) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/) are
  under the SIL Open Font License 1.1 (see `src/assets/fonts/`).
