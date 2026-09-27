# Password, Custom Password and Memorable Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename Standard/Strong to Password/Custom Password, add custom length/symbol controls, and add Memorable word-count/separator controls with capitalized EFF entries and a three-digit suffix.

**Architecture:** Keep presets and validation in `formats.ts`, generation in the existing framework-free core, and all application state in `usePyrgus`. Two new presentational controls use native ranges and installed Headless UI components. Preserve format IDs, the EFF list, storage keys and the existing security/clipboard architecture.

**Tech Stack:** Node 24, TypeScript 6, React 19 + React Compiler, Vite 8, Tailwind CSS v4, Headless UI 2, Vitest + Testing Library/jsdom, Playwright Chromium against production preview.

**Spec:** [Approved change spec](2026-09-27-custom-password-spec.md), amending [the binding spec](2026-09-26-pyrgus-web-spec.md). Read both and `AGENTS.md` before starting. **When the plan and the spec disagree, the spec wins; stop and report.**

## Global Constraints

The following repository constraints apply to every task:

- All randomness goes through `src/core/random.ts`. Never `Math.random` (lint enforces it); never `x % n` without rejection sampling.
- No network access: no `fetch`, XHR, third-party scripts, fonts, analytics or CDNs.
- Never loosen `vercel.json` headers or the CSP to make something work; fix the code.
- No `dangerouslySetInnerHTML`, inline scripts, `style="…"` attributes in HTML, or `data:` URIs.
- Never persist, log or `console.*` a generated secret. Only `pyrgus.format` and `pyrgus.pinLength` go to `localStorage`.
- Fail closed: on a randomness error show the error state, never a fallback value.
- Exact versions only (`.npmrc` has `save-exact=true`).
- Held majors: `typescript` 6.x (typescript-eslint needs `<6.1.0`), `@babel/core` 7.x (React Compiler), `@types/node` 24.x (matches Node 24).
- Runtime dependencies are `react`, `react-dom`, `@headlessui/react`, `clsx`. Ask before adding any other runtime dependency.
- Agents never fetch from the network or change installed packages themselves. Allowed without asking: `npm ci` (installs exactly what the committed lockfile says) and running tools that are already installed.
- `src/core/` imports no React and no DOM API other than `crypto`.
- Formats are data in `src/core/formats.ts`, not branches.
- React Compiler is on: no manual `useMemo` / `useCallback`.
- `erasableSyntaxOnly`: no `enum`, `namespace` or constructor parameter properties.
- Tests are colocated as `*.test.ts(x)` and import from `vitest` explicitly; component tests start with `// @vitest-environment jsdom`. Core changes are test-first.
- Prettier: no semicolons, single quotes, 120 columns.
- Work only inside this repository.
- The binding spec always describes the site as built. Edit it only in the same commit as the code it describes.
- No product code before both the spec and plan are approved. Execution method is selected by the user after plan review.
- No new dependency, download or copied Catalyst component is required. Retain `wordlist.ts`, its checksum/attribution, `LICENSE`, `AGENTS.md`, footer and apps-dialog copy. Never commit `tmp/`.
- Update the shared vectors and tell the user the native repository needs corresponding changes; do not edit that repository.

The approved behavior is binding across tasks:

- Retain all six internal IDs. Visible names: Password, Custom Password, Memorable, PIN, Secret 128, Secret 256. Default: `standard`.
- Custom Password: integer length 6–32, default 24; symbols default on. Require lowercase, uppercase and digit, plus a symbol when enabled. Symbols: `!@#$%^&*-_=+?`.
- Memorable: integer count 4–8, default 6; unchanged 7,776-entry EFF list, independent draws with repeats, initial-letter capitalization, suffix 000–999, separator `' '`, `'-'` or `'_'`, default `'-'`.
- Keep internal EFF hyphens; the chosen separator joins entries and precedes the number. Space is exactly U+0020.
- All four new settings live in page state only. A changed control regenerates immediately; a no-op does not. Switching formats retains settings; reload resets them.
- Custom entropy is an approximate upper bound, displayed with `~` and rounded down. Memorable entropy is exact: `n × log2(7776) + log2(1000)`, displayed to one decimal.

Use Node 24 for every command: in each shell invocation run `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null` first. Node 24.21.0 is already installed; the default shell currently selects Node 25.1.0. The command blocks below assume that initialization. Do not install a runtime or browser if missing; follow the repository's download/install approval rules. Run local binaries as `./node_modules/.bin/<tool>` to avoid an implicit `npx` download.

Every task finishes with `npm run lint && npm run build && npm test && npm run test:e2e`, all exit 0. Browser tests must use production headers and port 4173. Request the sandbox permission needed to bind that port if blocked; do not change the preview configuration or headers. Do not run competing builds/preview servers simultaneously.

## Review Focus

1. **Invalid values with unrelated settings present:** reject bad inputs for the selected format before consuming randomness; unrelated fields cannot affect another format. Task 1, Step 2.
2. **Hyphenated EFF entries and leading-zero suffixes:** entries stay intact and count once for every separator, including repeated entries and suffix 000. Task 1, Step 3.
3. **A delayed clipboard result after an option change:** stale resolve/reject cannot change current feedback, and a previously scheduled clipboard clear still runs. Task 2, Step 2.
4. **Reload or format-switch after editing options:** restore the saved format, retain options only across switches, and never create new storage keys. Task 2, Steps 1–2; Task 3, Step 3.
5. **Eight long words on a small or short screen:** controls and full output remain reachable, separators copy exactly, and keyboard focus survives regeneration. Task 3, Steps 2–3.

---

## File Map and Delivery Order

| File | Responsibility / change | Task |
| --- | --- | --- |
| `src/core/formats.ts`, `src/core/formats.test.ts` | New option contract, format data, validation, names | 1 |
| `src/core/generate.ts`, `src/core/generate.test.ts` | Capitalized words, selected joins and suffix; both option matrices | 1 |
| `src/core/entropy.ts`, `src/core/entropy.test.ts` | Clarify estimates and test parameter-dependent values | 1 |
| `src/core/random.test.ts` | Extend range tests to 1,000 | 1 |
| `src/core/test-vectors.json` | Version 2, option metadata, entropy/formatting cases | 1 |
| `src/hooks/usePyrgus.ts` | Adapt complete options, then own new state/setters | 1, 2 |
| `src/hooks/usePyrgus.test.ts` | State lifetime, no-op, failure and clipboard races | 2 |
| `src/lib/preferences.test.ts` | Existing IDs/storage behavior, no migration | 1 |
| `src/components/GeneratorCard.test.tsx` | Update old visible labels | 1 |
| `src/components/CustomPasswordControl.tsx` | New length range and symbol switch | 3 |
| `src/components/MemorableControl.tsx` | New word-count range and separator radio group | 3 |
| `src/components/GeneratorCard.tsx` | Wire conditional controls | 3 |
| `src/components/GeneratorCard.options.test.tsx` | New control integration tests | 3 |
| `src/components/GeneratorCard.error.test.tsx` | Options remain usable with no secret | 3 |
| `src/components/SecretDisplay.tsx`, `src/lib/spell.ts`, `src/lib/spell.test.ts` | Preserve and speak space separators | 3 |
| `e2e/password-options.spec.ts` | New keyboard, copy, reload, CSP and mobile tests | 3 |
| `e2e/layout.spec.ts` | Extend centring and short-screen coverage to configured formats | 3 |
| `README.md`, `docs/2026-09-26-pyrgus-web-spec.md` | Describe behavior as each commit introduces it | 1–3 |
| `docs/2026-09-27-custom-password-spec.md` | Mark Implemented only when the full design passes | 3 |

No files are deleted. No changes to `wordlist.ts`, `wordlist.test.ts`, the alphabets, clipboard implementation or preference implementation are expected. Keep their existing tests as regression coverage. `FormatPicker` already reads its labels from data and needs no implementation change.

Task 1 exposes the new core API and changes the visible labels/default Memorable output; Task 2 adds hook state; Task 3 exposes controls. Until Task 3 lands, documentation must distinguish available core/hook options from the UI, which still uses their defaults. Do not claim the sliders have shipped early. Execute tasks sequentially.

### Task 1: Generator Options, Memorable Formatting and Shared Vectors

**Files:** Modify `src/core/formats.ts`, `src/core/formats.test.ts`, `src/core/generate.ts`, `src/core/generate.test.ts`, `src/core/entropy.ts`, `src/core/entropy.test.ts`, `src/core/random.test.ts`, `src/core/test-vectors.json`, `src/hooks/usePyrgus.ts`, `src/lib/preferences.test.ts`, `src/components/GeneratorCard.test.tsx`, `README.md`, `docs/2026-09-26-pyrgus-web-spec.md`. Create/delete: none. Existing `src/core/wordlist.test.ts` and `src/core/charsets.test.ts` remain regression tests.

**Interfaces:**

- Consumes existing `randomInt(rng: RandomSource, n: number): number`, `ScriptedRandom(values: readonly number[])`, `SeededRandom(seed: number)` from `test-support/seeded-random.ts`, and `WORDLIST`.
- Produces `MemorableSeparator = ' ' | '-' | '_'` and `Options = { pinLength: PinLength; customLength: number; includeSymbols: boolean; memorableWordCount: number; memorableSeparator: MemorableSeparator }`.
- Produces `DEFAULT_OPTIONS = { pinLength: 6, customLength: 24, includeSymbols: true, memorableWordCount: 6, memorableSeparator: '-' }` typed as `Options`.
- `WordSpec = { kind: 'words'; wordCount: number; suffixDigits: 3; separator: MemorableSeparator; capitalizeFirst: true }`.
- Retains `formatSpec(id: FormatId, options: Options): FormatSpec`, `generate(id: FormatId, options: Options, rng?: RandomSource): string`, `entropyBits(id: FormatId, options: Options): number`, `isExactEntropy(id: FormatId, options: Options): boolean`, `formatEntropy(id: FormatId, options: Options): string`.
- Invalid selected-format options throw `RangeError` before any random draw. No new public validation helpers are required.

- [ ] **Step 1: Write failing preset and compatibility assertions.** In `formats.test.ts`, update the default/label assertions and replace only-PIN-reads-options with per-format option isolation. In `preferences.test.ts`, add `it.each(['standard', 'strong', 'memorable'])('restores saved %s')` asserting `readFormat()` returns the stored ID. Update `GeneratorCard.test.tsx` label assertions to Password; leave the same IDs in storage. Representative assertions:

```ts
expect(DEFAULT_OPTIONS).toEqual({
  pinLength: 6, customLength: 24, includeSymbols: true, memorableWordCount: 6, memorableSeparator: '-',
})
expect(FORMAT_IDS).toEqual(['standard', 'strong', 'memorable', 'pin', 'secret128', 'secret256'])
expect(FORMAT_LABELS).toEqual({
  standard: 'Password', strong: 'Custom Password', memorable: 'Memorable',
  pin: 'PIN', secret128: 'Secret 128', secret256: 'Secret 256',
})
expect(formatSpec('memorable', DEFAULT_OPTIONS)).toEqual({
  kind: 'words', wordCount: 6, suffixDigits: 3, separator: '-', capitalizeFirst: true,
})
```

- [ ] **Step 2: Write failing custom-option matrix and rejection tests.** In `generate.test.ts`, parameterize lengths 6–32 and both symbol settings; for each combination generate 100 seeded samples. Assert exact length, membership in the appropriate 75/62-character alphabet, every required class, and no symbol when off. In `formats.test.ts`, table-test invalid fields: custom lengths `[5, 33, 6.5, NaN, Infinity, -Infinity, '6', null, undefined]`, symbol values `[0, 1, 'true', null, undefined]`, word counts `[3, 9, 4.5, NaN, Infinity, -Infinity, '6', null, undefined]`, and separators `['', '  ', '\t', '\n', '.', null, undefined]`. Cast deliberately invalid fixtures through `unknown as Options` in tests only. Assert all three core entry points reject and generation consumes zero draws:

```ts
const rng = new ScriptedRandom([])
expect(() => formatSpec(id, invalidOptions)).toThrow(RangeError)
expect(() => generate(id, invalidOptions, rng)).toThrow(RangeError)
expect(() => entropyBits(id, invalidOptions)).toThrow(RangeError)
expect(rng.consumed).toBe(0)
```

For each format, alter only unrelated fields (including invalid unrelated values); assert identical specs, entropy, and generated values using two fresh `SeededRandom(42)` sources. Keep Password, PIN and hex shape/exclusion/uniformity tests.

- [ ] **Step 3: Write failing Memorable matrix/formatting tests.** Replace the old four-word/two-digit expectations. For every count 4–8 and separator, script valid indices and each suffix in `[0, 7, 42, 999]`; assert exact joined output and `rng.consumed === count + 1`. Include repeated index 0 and all four internal-hyphen entries. Pin the default and internal-hyphen examples explicitly:

```ts
expect(generate('memorable', DEFAULT_OPTIONS, new ScriptedRandom([0, 0, 0, 0, 0, 0, 7])))
  .toBe('Abacus-Abacus-Abacus-Abacus-Abacus-Abacus-007')
const indices = ['drop-down', 'felt-tip', 't-shirt', 'yo-yo'].map((w) => WORDLIST.indexOf(w))
expect(indices.every((i) => i >= 0)).toBe(true)
expect(generate('memorable', { ...DEFAULT_OPTIONS, memorableWordCount: 4, memorableSeparator: '_' },
  new ScriptedRandom([...indices, 0]))).toBe('Drop-down_Felt-tip_T-shirt_Yo-yo_000')
```

Do not infer word count with `split('-')`. Also sample all 15 combinations using seeded randomness and assert selected-entry membership via capitalized entry starts, correct suffix and exact separators. Add a generator rejection case with a biased-zone value immediately before a valid word/suffix draw.

- [ ] **Step 4: Write entropy/vector tests and extend randomness regression coverage.** In `entropy.test.ts`, check all 54 custom length/symbol combinations against `n * Math.log2(symbols ? 75 : 62)` and `~${Math.floor(bits)}`, with `isExactEntropy === false`. Check every Memorable count/separator against `n * Math.log2(7776) + Math.log2(1000)`, exact=true, and displays `['61.7', '74.6', '87.5', '100.4', '113.4']`. Add assertions for vector version 2, metadata, case coverage and generation through each stored formatting case. Preserve the existing wordlist/alphabets checks. In `random.test.ts` add:

```ts
it('rejects the biased suffix range for n = 1000', () => {
  const rng = new ScriptedRandom([4294967000, 0xffffffff, 4294966999])
  expect(randomInt(rng, 1000)).toBe(999)
  expect(rng.consumed).toBe(3)
})
```

Add `[1000, 100_000]` to the existing seeded uniformity cases. These unchanged-algorithm regressions may already pass; the new generator and entropy expectations must fail before implementation.

- [ ] **Step 5: Run the red tests.** `npm test -- src/core/formats.test.ts src/core/generate.test.ts src/core/entropy.test.ts src/core/random.test.ts src/lib/preferences.test.ts src/components/GeneratorCard.test.tsx`. Expected: failures for old labels/defaults, ignored options and old Memorable output. Check failures are those behaviors, not a bad import or test fixture. Do not update production code before this run.

- [ ] **Step 6: Implement the core option contract.** In `formats.ts`, add the interface fields above, update only the two labels, and configure the `strong` and `memorable` table functions. Validate only each function's own fields. Use the existing `LOWER`, `UPPER`, `DIGITS`, `SYMBOLS`, `STRONG_BASE`; when symbols are off use `LOWER + UPPER + DIGITS` and three required sets. Preserve all other presets. In `generate.ts`, update `generateWords(spec: WordSpec, rng: RandomSource): string` to capitalize entry initials and join the padded suffix with the selected separator; retain the character algorithm. Keep entropy formulas data-driven; correct the `entropy.ts` comments to distinguish exact counts from custom upper bounds.

- [ ] **Step 7: Write version-2 vectors.** Preserve alphabet keys, EFF metadata/checksum and unrelated entropy entries. Set `entropy.memorable` to `{ "bits": 87.5147, "display": "87.5" }`. Add the `custom` and `memorable` objects exactly as specified under Generation, entropy and vectors. Include custom lengths 6, 24, 32 with both flags; all five Memorable counts; and formatting cases with numeric `wordIndices`, numeric `suffix`, `separator`, and literal `expected`. Cover all three separators, repeats, 000/007/042/999 and internal hyphens. Store bits to four decimal places. Use an offline calculation for numeric fixtures and explicit expected strings, not snapshots generated by the implementation under test.

- [ ] **Step 8: Adapt complete-option callers.** In `usePyrgus.ts`, temporarily call both generation and entropy with `{ ...DEFAULT_OPTIONS, pinLength }`; the public hook stays unchanged until Task 2. Update the explicit `{ pinLength }` test arguments in `formats.test.ts`, `generate.test.ts`, `entropy.test.ts` to spread defaults. Retain `src/lib/preferences.ts` unchanged. Use `rg -n 'generate\(|formatSpec\(|entropyBits\(|formatEntropy\(' src` to check no old incomplete options remain.

- [ ] **Step 9: Run focused green tests.** Repeat Step 5 and run `npm test -- src/core/wordlist.test.ts src/core/charsets.test.ts`. Expected: all pass, including unchanged EFF hash. There is no download or wordlist edit.

- [ ] **Step 10: Update documentation for the delivered core.** Apply approved amendment items 2–5 (formats/API/generation/entropy/vectors), the label part of item 6, and the relevant testing/native-parity notes in items 8–9 to the binding spec. It must say the core supports these options while the current UI uses 24/on and six/hyphen defaults; do not yet describe rendered controls or hook setters. Update README labels, default Memorable example/entropy and exclusions note. Record native parity as pending. The remaining UI and session documentation lands in Tasks 2–3.

- [ ] **Step 11: Format and pass all gates.** Run `./node_modules/.bin/prettier --write src/core/formats.ts src/core/formats.test.ts src/core/generate.ts src/core/generate.test.ts src/core/entropy.ts src/core/entropy.test.ts src/core/random.test.ts src/core/test-vectors.json src/hooks/usePyrgus.ts src/lib/preferences.test.ts src/components/GeneratorCard.test.tsx README.md`, then `git diff --check`, then `npm run lint && npm run build && npm test && npm run test:e2e`. Expected: all exit 0, no CSP/Trusted Types violations, and existing layout/clipboard coverage passes.

- [ ] **Step 12: Commit the core and matching documentation.** Inspect the diff; exclude generated files and `tmp/`.

```sh
git add src/core/formats.ts src/core/formats.test.ts src/core/generate.ts src/core/generate.test.ts src/core/entropy.ts src/core/entropy.test.ts src/core/random.test.ts src/core/test-vectors.json src/hooks/usePyrgus.ts src/lib/preferences.test.ts src/components/GeneratorCard.test.tsx README.md docs/2026-09-26-pyrgus-web-spec.md
git commit -m "feat: configure password generation and memorable formatting"
```

### Task 2: Page-State Options and Safe Regeneration

**Files:** Modify `src/hooks/usePyrgus.ts`, `src/hooks/usePyrgus.test.ts`, `docs/2026-09-26-pyrgus-web-spec.md`. Create/delete: none.

**Interfaces:**

- Consumes Task 1's `Options`, `MemorableSeparator`, `DEFAULT_OPTIONS`, generation and entropy functions.
- Retains `usePyrgus(): Pyrgus` and every current field/action. Adds `customLength: number`, `includeSymbols: boolean`, `memorableWordCount: number`, `memorableSeparator: MemorableSeparator`.
- Adds `setCustomLength(n: number): void`, `setIncludeSymbols(value: boolean): void`, `setMemorableWordCount(n: number): void`, `setMemorableSeparator(value: MemorableSeparator): void`.
- Internal helper becomes `tryGenerate(format: FormatId, options: Options): string | null`; internal regeneration becomes `next(nextFormat: FormatId, nextOptions: Options): void`.

- [ ] **Step 1: Write failing state/lifetime tests.** Extend `usePyrgus.test.ts` using the existing renderHook/act and clipboard fixtures. Assert initial fields equal Task 1 defaults; each setter updates its field, generates against the complete next options, refreshes entropy, clears both feedback flags, and increments announcementId. Use `vi.spyOn` on the imported generation module where call arguments/counts are required, restoring spies after each test. Assert changes preserve the other three fields; switch away/back; then unmount/remount with the selected format stored. Include these named assertions:

```ts
// 'keeps Memorable settings across switches but resets them on remount'
act(() => result.current.setFormat('memorable'))
act(() => result.current.setMemorableWordCount(8))
act(() => result.current.setMemorableSeparator(' '))
expect(result.current).toMatchObject({ memorableWordCount: 8, memorableSeparator: ' ', entropy: '113.4' })
act(() => result.current.setFormat('strong'))
act(() => result.current.setCustomLength(6))
act(() => result.current.setIncludeSymbols(false))
expect(result.current).toMatchObject({ customLength: 6, includeSymbols: false, entropy: '~35' })
act(() => result.current.setFormat('memorable'))
expect(result.current).toMatchObject({ memorableWordCount: 8, memorableSeparator: ' ', entropy: '113.4' })
```

After remount, assert the saved format is Memorable with six/hyphen and 87.5, plus custom defaults 24/on. Repeat restoration with saved `strong`. In `it.each` over all four new setters, pass the current value and assert password, announcementId and generate-call count remain unchanged. Spy on Storage setItem while exercising new controls; after explicitly setting format and PIN, assert `Object.keys(localStorage).sort()` equals only the two permitted keys. Neither values nor extra settings may be written. Repeat option changes with Storage methods throwing and assert generation still works.

- [ ] **Step 2: Write failing race/failure tests.** Extend the existing delayed-write resolve/reject matrix to all four new setters, selecting their relevant format first. Keep assertions that the latest password is preserved, copied/copyFailed remain false and announcement stays New password generated. Parameterize the existing 90-second-clear test for the four controls; use fake timers, focus=true and matching clipboard content, and expect the old clear still writes `''`. Add a generation failure after successful mount for each option change: spy on `generate`, throw only on the next call, then assert `password === null`, `error === true` and no stale copied state. A subsequent successful change recovers with a matching result. Test change after both prior copy success and prior copy failure.

```ts
// 'ignores a delayed copy after an option change', after resolving/rejecting the old write
expect(result.current.password).toBe(currentPassword)
expect(result.current).toMatchObject({ copied: false, copyFailed: false, announcement: 'New password generated' })
// 'fails closed when generation throws after a setting changes'
expect(result.current).toMatchObject({ password: null, error: true, copied: false, copyFailed: false })
// 'keeps the clear of an already copied secret armed', after advancing CLEAR_AFTER_MS
expect(writeText).toHaveBeenCalledWith('')
```

- [ ] **Step 3: Run the red tests.** `npm test -- src/hooks/usePyrgus.test.ts`. Expected: missing fields/setters or absent regeneration behavior fail; existing clipboard tests pass. Use module spies rather than altering global crypto because its buffered randomness can postpone a crypto failure.

- [ ] **Step 4: Implement state and setters.** Initialize the four page-only fields from `DEFAULT_OPTIONS`; construct complete options for generation and entropy. Each setter returns early when its value is unchanged, otherwise stores its value and passes a complete next-options object to `next` (do not generate from stale pre-update state). Existing format, PIN and Regenerate actions retain the new settings. Keep the existing feedback-version invalidation and announcements in the shared regeneration path; do not reimplement clipboard clearing or persist new preferences. No manual memoization or generation effect is needed.

- [ ] **Step 5: Run focused green tests.** `npm test -- src/hooks/usePyrgus.test.ts src/lib/preferences.test.ts src/lib/clipboard.test.ts`. Expected: all pass, including pending-write outcomes and the previously copied secret's scheduled clear.

- [ ] **Step 6: Update the binding State/Clipboard sections.** Apply the hook and page-lifetime parts of amendment 6, including saved-ID compatibility, no-op behavior, all four setters and feedback invalidation. Add the corresponding hook tests to the Testing section. Keep the generator-card description truthful: the new hook API is available, while rendered controls arrive in Task 3.

- [ ] **Step 7: Format and pass all gates.** `./node_modules/.bin/prettier --write src/hooks/usePyrgus.ts src/hooks/usePyrgus.test.ts`, then `git diff --check`, then `npm run lint && npm run build && npm test && npm run test:e2e`. Expected: all exit 0.

- [ ] **Step 8: Commit.**

```sh
git add src/hooks/usePyrgus.ts src/hooks/usePyrgus.test.ts docs/2026-09-26-pyrgus-web-spec.md
git commit -m "feat: manage page-only password options and copy feedback"
```

### Task 3: Accessible Controls, Exact Copying and Browser Verification

**Files:** Create `src/components/CustomPasswordControl.tsx`, `src/components/MemorableControl.tsx`, `src/components/GeneratorCard.options.test.tsx`, `e2e/password-options.spec.ts`. Modify `src/components/GeneratorCard.tsx`, `src/components/GeneratorCard.error.test.tsx`, `src/components/SecretDisplay.tsx`, `src/lib/spell.ts`, `src/lib/spell.test.ts`, `e2e/layout.spec.ts`, `README.md`, both current spec files. Delete: none.

**Interfaces:**

- Consumes Task 2's four fields/setters. `GeneratorCard` selects controls with `p.format === 'strong'` or `'memorable'`.
- `CustomPasswordControl(props: { length: number; includeSymbols: boolean; onLengthChange(n: number): void; onIncludeSymbolsChange(value: boolean): void }): React.JSX.Element`.
- `MemorableControl(props: { wordCount: number; separator: MemorableSeparator; onWordCountChange(n: number): void; onSeparatorChange(value: MemorableSeparator): void }): React.JSX.Element`.
- Retains `SecretDisplay({ value, onCopy })` and `spell(secret: string): string`; the latter now names ASCII space.
- Test helpers local to the new files: component `chooseFormat(user: ReturnType<typeof userEvent.setup>, label: string): Promise<void>` and browser `chooseFormat(page: Page, label: string): Promise<void>`, following existing tests. Avoid a new production abstraction or generic settings framework.

- [ ] **Step 1: Write failing control integration tests.** Create `GeneratorCard.options.test.tsx` with the jsdom comment and existing GeneratorCard test setup pattern (install clipboard stub after userEvent.setup, cancel pending clear and clear storage on cleanup). Under Password, assert no sliders, switch or Separator group. Select Custom Password and assert range name Password length, value 24, min/max/step 6/32/1, value text `24 characters`, visible `Length: 24`, and checked Include symbols. Select Memorable and assert Words=6, bounds 4/8/1, value text `6 words`, visible `Words: 6`, and checked Hyphen (-). Use `fireEvent.change` for range input values in jsdom; native keyboard behavior is tested in Playwright. Assert conditional removal on PIN and secret formats, regeneration/entropy on every option, and settings restored after switches. Example:

```ts
// 'changes Memorable word count and separator, preserving the exact copied string'
await chooseFormat(user, 'Memorable')
fireEvent.change(screen.getByRole('slider', { name: 'Words' }), { target: { value: '4' } })
await user.click(screen.getByRole('radio', { name: 'Space', exact: true }))
expect(screen.getByText('61.7 bits of entropy')).toBeInTheDocument()
const value = screen.getByTestId('secret').textContent!
expect(value).toMatch(/^(?:[A-Z][a-z-]* ){4}\d{3}$/)
await user.click(screen.getByRole('button', { name: 'Copy', exact: true }))
expect(writeText).toHaveBeenCalledWith(value)
```

Exercise all separators, including underscore with an internal-hyphen fixture from Task 1. Assert regeneration clears visible Copied/copy-failed feedback and a repeated same-value event leaves the status node unchanged. Keep the live region free of the generated value.

- [ ] **Step 2: Write failing error/display/speech tests.** In `GeneratorCard.error.test.tsx`, seed each configurable format in storage while the existing mocked generator throws. Assert its controls remain present, no secret renders, error alert is unchanged, and Copy/Regenerate stay disabled. Select another valid option and confirm it stays fail-closed. Clean storage after each case. In `spell.test.ts` add `it('names spaces without losing case or separators')` with:

```ts
expect(spell('Ab _-007')).toBe('capital A, b, space, underscore, dash, 0, 0, 7')
```

In the options component test, render a scripted space-separated Memorable fixture ending ` 007`; compare `textContent` exactly, check the spoken text includes space and capital names, and verify `translate="no"` covers both representations.

- [ ] **Step 3: Write failing browser tests before the controls.** In `e2e/password-options.spec.ts`, use the existing `smoke.spec.ts` pattern to collect securitypolicyviolation, console error and pageerror events before navigation; assert their arrays are empty at each test's end. Keep injected scripts test-only through `page.addInitScript` (DevTools), never production inline code. Add these cases:

| Test name | Actions and assertions |
| --- | --- |
| `custom controls support keyboard boundaries and exact copying` | Select Custom Password, focus Password length, press Home → 6, ArrowRight → 7, End → 32; assert range value/text, matching secret length and focus after each. Focus Include symbols and press Space; assert unchecked and output only letters/digits with all three classes. Press Space again, assert at least one symbol and length 32. Grant clipboard read/write permissions; Copy and compare clipboard to raw `textContent`. |
| `memorable controls support every separator and preserve focus` | Select Memorable, focus Words, press Home → 4, ArrowRight → 5, End → 8; assert 61.7/74.6/113.4 captions and matching entry count. Use the RadioGroup keyboard behavior to reach Space, Hyphen (-), Underscore (_); assert checked state, exact chosen joins, no trailing separator, and focused radio after regeneration. Copy the space case and compare exact strings, including three suffix digits. |
| `saved format survives reload while options reset` | Change each format's options, switch away/back to check retention, reload with `strong` saved and assert 24/on; repeat with `memorable` saved and assert six/hyphen. Explicitly set PIN length too and assert storage contains exactly `pyrgus.format` and `pyrgus.pinLength`. |
| `long memorable results and controls fit 320 by 640` | Test all separators with eight deliberately long entries. Assert document and secret scroll widths do not exceed their client widths, secret scrollHeight ≤ clientHeight, and every control and Copy can be scrolled fully into view. Raw copied string remains identical after wrapping. Include a 32-character Custom Password case. |

For deterministic long words, import `WORDLIST` only in the Playwright test process, find the longest entry's index, and pass that number to a test-only init script overriding `crypto.getRandomValues` to fill its Uint32Array with that index. Every word draw then picks that entry; suffix is the same raw value reduced by the actual generator. This fixture exercises real production generation/layout without shipping a test hook. Leading-zero and internal-hyphen fixtures are already pinned in the core/component tests; the browser verifies raw-copy equality. Do not log password values. Representative browser assertions:

```ts
// 'custom controls support keyboard boundaries and exact copying'
const slider = page.getByRole('slider', { name: 'Password length' })
await slider.focus()
await slider.press('End')
await expect(slider).toHaveValue('32')
await expect(slider).toBeFocused()
expect((await page.getByTestId('secret').textContent())!.length).toBe(32)
// 'long memorable results and controls fit 320 by 640', using the existing layout-metrics pattern
expect(metrics.docWidth).toBeLessThanOrEqual(320)
expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight)
expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.getByTestId('secret').textContent())
```

Extend existing centring/short-screen tests in `e2e/layout.spec.ts` to Password, Custom Password and Memorable. For desktop centring use a viewport tall enough for all content (1280 × 1200), select maximum length/count, and retain the ±1 px gap comparison. At 1280 × 400 assert nonnegative gaps/no overlap and page scrolling. Keep existing 320/640 px and dialog tests intact.

- [ ] **Step 4: Run the red tests.** `npm test -- src/components/GeneratorCard.options.test.tsx src/components/GeneratorCard.error.test.tsx src/lib/spell.test.ts` and `npm run test:e2e -- e2e/password-options.spec.ts`. Expected: missing sliders/switch/group and missing spoken space fail. Stop after confirming those failures; do not weaken selectors, headers or timeout policy to make them green.

- [ ] **Step 5: Implement both presentational controls.** Create the two components with the signatures above. Use native ranges and Headless UI `Switch`, `RadioGroup`, `Radio` imported from the installed dependency. No Catalyst copying is needed. Custom rows: visible Length: value + full-width range/endpoints, then Include symbols + switch. Memorable rows: Words: value + range/endpoints, then Separator + Space / Hyphen (-) / Underscore (_). Use stable `useId()`-based label associations (or Headless UI label associations), specified accessible names/value text, visible focus and light/dark styling. Match `PinLengthControl`'s checked state style; let long separator labels stack on narrow screens. Let native controls own keyboard behavior, and convert range strings with `Number(event.currentTarget.value)` before invoking callbacks.

- [ ] **Step 6: Wire and render exact values.** In `GeneratorCard`, render the appropriate component directly after the picker row and before the secret/error branch. Pass the hook fields/setters; retain the PIN row. Use normal flow, existing card sizes and no fixed height. In `SecretDisplay`, add `whitespace-pre-wrap` alongside existing wrapping; keep raw text, digit highlighting, click-to-copy, translate opt-out and no truncation. In `spell.ts` add `' ': 'space'` and rename the old Strong test description to Custom Password if touched. Retain the existing error copy and disabled action rules.

- [ ] **Step 7: Run focused green tests.** Repeat Step 4, then `npm run test:e2e -- e2e/layout.spec.ts e2e/smoke.spec.ts`. Expected: all pass under production CSP, with exact copying, stable keyboard focus and no horizontal overflow. Fix code rather than weakening the assertions.

- [ ] **Step 8: Inspect the rendered result.** Using the installed browser tooling/Playwright, inspect both configurable formats in light/dark themes at widths 320, 768 and 1280, plus the short 1280 × 400 viewport. Check maximum length/count, all separator labels, focus rings, switch thumb state, readable selected radio, full wrapped output and reachable actions. Capture screenshots only with deterministic test fixtures, never real generated secrets; store them in ignored test output or `tmp/`. If adjustments are needed, rerun the affected tests and all final gates below.

- [ ] **Step 9: Finish binding-spec and README amendments.** Apply remaining change-spec items 1, 6–8 and 10: exposed controls, exact copy/spoken spaces, core/UI distinction removed, project tree, testing/manual checks, six-format table, custom 24/on and Memorable six/hyphen defaults and full ranges. State only format/PIN persist. Keep the EFF attribution and Six formats apps copy. Confirm native follow-up remains pending. Check every numbered amendment against the final binding spec; Task 1/2 changes must not be dropped or described as future work.

- [ ] **Step 10: Format and run final gates.** Run `./node_modules/.bin/prettier --write src/components/CustomPasswordControl.tsx src/components/MemorableControl.tsx src/components/GeneratorCard.tsx src/components/GeneratorCard.options.test.tsx src/components/GeneratorCard.error.test.tsx src/components/SecretDisplay.tsx src/lib/spell.ts src/lib/spell.test.ts e2e/password-options.spec.ts e2e/layout.spec.ts README.md`, then `git diff --check`, then `npm run lint && npm run build && npm test && npm run test:e2e`. Expected: all exit 0. Retain the existing security-header and built-output tests; verify no package, CSP, wordlist or generated-artifact changes entered the diff.

- [ ] **Step 11: Mark implementation complete and commit.** Only after all gates and visual checks pass, change this change spec's status to `Implemented YYYY-MM-DD` using the actual completion date, then leave it immutable. Check the documentation diff before staging.

```sh
git add src/components/CustomPasswordControl.tsx src/components/MemorableControl.tsx src/components/GeneratorCard.tsx src/components/GeneratorCard.options.test.tsx src/components/GeneratorCard.error.test.tsx src/components/SecretDisplay.tsx src/lib/spell.ts src/lib/spell.test.ts e2e/password-options.spec.ts e2e/layout.spec.ts README.md docs/2026-09-26-pyrgus-web-spec.md docs/2026-09-27-custom-password-spec.md
git commit -m "feat: add accessible custom and memorable password controls"
```

Report test results, any remaining limitation, and the native-app parity work required for names, custom options, Memorable rules and version-2 vectors. Do not claim the native repo has been updated.

## Plan Review and Execution Handoff

Self-review coverage: Task 1 owns core/data/validation/vectors and compatibility; Task 2 owns state/storage/clipboard failures; Task 3 owns controls/display/accessibility/browser layout and final documentation. Every Review Focus item has a named test step. No implementation begins until the user reviews this plan and selects an execution method.

Recommended execution: **Native** — implement the three sequential tasks in this session, then a fresh reviewer checks the whole branch. All three share one option contract and hook, so keeping implementation context together avoids repeated handoffs. **Subagent-driven** is also available: a fresh implementer and reviewer for each task, followed by whole-branch review, at higher context cost.
