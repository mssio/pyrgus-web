# Pyrgus Web — Password, Custom Password and Memorable Options — Design

**Date:** 2026-09-27
**Status:** Draft
**Amends:** `docs/2026-09-26-pyrgus-web-spec.md` (the binding spec). Apply the amendments below
in the same implementation commits as the behavior they describe.

## Summary

Rename Standard to **Password** and Strong to **Custom Password**. Custom Password has a length
slider from 6 through 32 characters and an Include symbols switch, defaulting to 24 characters
and symbols enabled. Retain **Memorable** and its EFF long wordlist, with a 4–8 word slider,
first-letter capitalization, a three-digit suffix and a choice of space, hyphen or underscore
separator. Memorable defaults to six words separated by hyphens.

## Intent

**User requests and agreed decisions:**

- Retain Memorable and the existing 7,776-entry EFF long wordlist. This supersedes the earlier
  removal proposal and the subsequent proposal to replace EFF with BIP39.
- Add a 4–8 word slider, defaulting to six words. Capitalize each word's first letter and append
  a random three-digit suffix from 000–999, preserving leading zeros.
- Offer Space, Hyphen (-) and Underscore (_) separators, defaulting to hyphen; use the selected
  separator before the number too. Select words independently, allowing repeats.
- Rename Standard and Strong. After considering Good Password, the user chose the recommended
  names Password and Custom Password.
- Add a 6–32 character slider and an Include symbols toggle to Custom Password.
- Preserve the current Strong defaults: 24 characters, symbols enabled.
- Keep Password as the default, with its existing generation rules.
- Show each format's options below the format picker. Changing an option immediately regenerates
  the password and updates its entropy caption.
- Require lowercase, uppercase and digits in Custom Password, plus a symbol when enabled.
- Keep custom and Memorable settings while switching formats in the current page, but reset them
  on reload. Retain the EFF wordlist credit and saved Memorable format selections.
- Cover keyboard accessibility, mobile layout, generation and security in testing; update the
  shared test vectors and flag the corresponding native-app work separately.

**Implementation choices proposed by this spec:**

- Retain internal IDs `standard` and `strong` for storage compatibility; only their visible labels change.
- Use native range inputs and the already installed Headless UI Switch and RadioGroup. No additional
  dependency or copied Catalyst component is needed.
- Keep internal hyphens in EFF entries such as `drop-down`; capitalize only the initial letter of
  the whole entry (`Drop-down`). Separator choices affect joins between entries, not their contents.
- Preserve the existing character-generation algorithm and approximate entropy convention.

**Success looks like:** the default remains a one-click password generator; Custom Password and
Memorable each expose two controls, and every displayed or copied result matches their current values.

## Non-goals

- Additional character-class toggles, editable alphabets, character-password grouping controls,
  numeric length fields, configurable capitalization or configurable suffix length.
- Replacing or filtering the EFF list, removing its internal hyphens, or prohibiting repeated words.
- Persisting custom/Memorable settings, generated secrets or password history.
- A new strength meter, strength adjectives or a replacement entropy algorithm.
- Changes to Password's alphabet, grouping or distribution; PIN or secret-key generation; or clipboard timing.
- Native-repository edits, new dependencies, downloads or changes to security headers.
- Rewriting historical implemented specs or plans.

## Design

### Formats and options — `src/core/formats.ts`, `src/core/charsets.ts`

There are six formats, in this order:

| Internal ID | Visible label | Behavior |
| --- | --- | --- |
| `standard` | Password | Existing 18 generated characters, grouped 6-6-6 with two dashes |
| `strong` | Custom Password | 6–32 ungrouped characters; optional symbols |
| `memorable` | Memorable | 4–8 capitalized EFF entries plus 3 digits, with a selectable separator |
| `pin` | PIN | Existing 4, 6 or 8 digits, default 6 |
| `secret128` | Secret 128 | Existing 32 lowercase hex characters |
| `secret256` | Secret 256 | Existing 64 lowercase hex characters |

The Passwords picker group contains `standard`, `strong`, `memorable`, `pin`; Secrets contains the two
secret formats. `DEFAULT_FORMAT` remains `standard`. Keep all current IDs, including `memorable`,
in `FormatId`, groups, specs and validation. Keep the existing `STANDARD_*` and `STRONG_BASE`
constants and vector alphabet keys where they still apply; these internal names do not appear in the UI.

Extend `Options` with required `customLength: number`, `includeSymbols: boolean`,
`memorableWordCount: number` and `memorableSeparator: ' ' | '-' | '_'`, alongside `pinLength`.
Defaults are `{ pinLength: 6, customLength: 24, includeSymbols: true, memorableWordCount: 6,
memorableSeparator: '-' }`. Export the separator union as `MemorableSeparator`. Existing callers
and tests supply complete options, typically by spreading `DEFAULT_OPTIONS`.

Only the `strong` spec reads the custom fields. Its length is an integer from 6 through 32 inclusive.
Reject non-integers, non-finite values and out-of-range lengths, and non-boolean symbol settings,
with a `RangeError` before generation or entropy calculation; do not silently clamp or coerce them.
Other formats ignore the custom fields, just as unrelated options currently do not affect them.

Only the `memorable` spec reads the Memorable fields. Validate an integer word count from 4 through
8 inclusive and exactly one of the three separator strings; reject invalid values with `RangeError`
before generation or entropy calculation, without coercion or clamping. In `WordSpec`, change
`wordCount` from literal 4 to `number`, `suffixDigits` from literal 2 to literal 3, `separator` to
`MemorableSeparator`, and add `capitalizeFirst: true` to describe the formatting as data.

| Include symbols | Base alphabet | Required at least once each |
| --- | --- | --- |
| On | Lowercase + uppercase + digits + `!@#$%^&*-_=+?` (75 characters) | Lowercase, uppercase, digit, symbol |
| Off | Lowercase + uppercase + digits (62 characters) | Lowercase, uppercase, digit |

With symbols off, no symbol can appear. Both modes use all ASCII letters and digits, including
look-alike characters; Password retains its existing exclusions. Custom Password has no separators,
so its selected length is its exact output length. Keep format behavior as data in `formats.ts`.

### Generation, entropy and vectors — `src/core/`

Reuse the existing algorithm: draw the base characters, choose distinct required-character positions
with the existing shuffle, then populate each required position from its character class. All
randomness continues through `random.ts` with rejection sampling.

Retain `WordSpec`, the `words` generation and entropy cases, and the existing frozen EFF list in
`wordlist.ts`. Preserve its order, all 7,776 entries, attribution and SHA-256 verification.
No download is needed. For Memorable:

1. Draw `wordCount` entries independently with `randomInt(rng, WORDLIST.length)`. Repeats are allowed.
2. Uppercase each entry's first ASCII letter; leave every remaining character unchanged. In particular,
   `drop-down`, `felt-tip`, `t-shirt` and `yo-yo` become `Drop-down`, `Felt-tip`, `T-shirt` and `Yo-yo`.
   Each counts as one selected word; internal hyphens remain even when the join separator is space or underscore.
3. Draw `randomInt(rng, 1000)`, format as exactly three digits using zero-padding, then join the
   capitalized entries and this suffix with the selected separator. No leading or trailing separator.

Space means one ASCII space (U+0020), not a tab, newline or arbitrary whitespace. The suffix is
separated exactly like another entry. Changing the separator regenerates the entire password,
matching the existing behavior of other option changes.

Memorable entropy is exact: `wordCount × log2(7776) + log2(1000)`, displayed with one decimal place.
Deterministic capitalization and a user-selected separator contribute no entropy. Capitalized
entry starts distinguish joins from internal lowercase hyphens, so formatting does not merge
distinct sequences into the same result.

| Words | Entropy display |
| --- | --- |
| 4 | 61.7 |
| 5 | 74.6 |
| 6 (default) | 87.5 |
| 7 | 100.4 |
| 8 | 113.4 |

Custom Password's displayed estimate follows the current convention:

- Symbols on: `customLength × log2(75)`.
- Symbols off: `customLength × log2(62)`.
- Display `~` followed by the estimate rounded down; the default remains `~149`.
- Both modes are approximate upper bounds, not exact entropy or the exact logarithm of the valid
  output count. Required classes and the overlapping base alphabet make the output non-uniform.
  Do not describe the difference as necessarily marginal across the new length range.

Password, PIN and secret formats retain their current entropy and display rules. The caption remains
`<value> bits of entropy`, with no strength adjective or color judgment.

Increment `src/core/test-vectors.json` to version 2. Retain its unchanged `wordlist` metadata and
alphabet keys. Update `entropy.memorable` to `{ bits: 87.5147, display: '87.5' }`, representing the
new six-word/three-digit default. Preserve the default `strong` entropy entry; add a
`custom` object with `minLength: 6`, `maxLength: 32`, `defaultLength: 24`,
`defaultIncludeSymbols: true`, and `cases`. Each case records `length`, `includeSymbols`, `bits`
(rounded to four decimal places) and `display`. Include all six combinations of lengths 6, 24
and 32 with symbols on and off. These explicitly describe both custom modes for native consumers.

Also add a `memorable` object containing `minWordCount: 4`, `maxWordCount: 8`, `defaultWordCount: 6`,
`suffixDigits: 3`, `capitalizeFirst: true`, `defaultSeparator: '-'`, `separators: [' ', '-', '_']`,
and `cases`. Each case records `wordCount`, `bits` (four decimal places) and `display`. Cover all
five word counts; separator choices have identical entropy. Add `formattingCases` with selected
`wordIndices`, numeric `suffix`, `separator` and `expected` output. Cover all three separators,
leading-zero suffixes, repeated entries and all four internally hyphenated entries. Tests feed
these indices and suffixes through a deterministic RandomSource to verify actual generator output.

The implementation handoff must tell the user that the native repo needs the matching names,
Custom Password options, Memorable generation/options and version-2 vectors. Do not edit that repo
or claim parity is already restored.

### State and preferences — `src/hooks/usePyrgus.ts`, `src/lib/preferences.ts`

`usePyrgus` owns `customLength`, `includeSymbols`, `memorableWordCount` and `memorableSeparator` with
their defaults and exposes setters alongside the existing state and actions. Generation and
entropy receive the same complete options object.

Changing any Custom Password or Memorable control updates its value, generates a matching password immediately,
clears copied/copy-failed feedback and announces New password generated. A no-op control event
does not regenerate. Settings remain in hook state when another format is selected; returning to
Custom Password or Memorable uses the corresponding settings. Reloading restores all four option
defaults, even if the saved format is Custom Password or Memorable.

Use the existing feedback-version mechanism to ignore an in-flight copy result after a custom or Memorable
setting changes. As with regeneration today, this does not cancel the clipboard clear scheduled
for a previously copied secret. A generation error clears the displayed password and shows the
existing fail-closed error state, never a stale secret with new control values.

Only `pyrgus.format` and `pyrgus.pinLength` are persisted. Stored `standard` and `strong` remain
valid and display their new names. Stored `memorable` remains valid and restores Memorable with
its new option defaults. Invalid values, blocked storage and missing values use the existing
fallback to `standard`. No storage migration is needed. Never read or write custom or Memorable
settings in storage.

### Controls — `src/components/CustomPasswordControl.tsx`, `GeneratorCard.tsx`

Add a presentational `CustomPasswordControl` receiving the two values and change callbacks.
Render it only for `strong`, below the existing picker row and above the secret. Use two stacked
rows within the current card width:

1. A visible `Length: 24` label (number reflects state), followed by a full-width native
   `<input type="range">` with `min=6`, `max=32`, `step=1`, and endpoint captions 6 and 32.
2. A visible Include symbols label and a Headless UI Switch, styled with Tailwind utilities to
   match the existing controls and indigo accent. Its thumb position and checked state distinguish
   on/off without relying solely on color.

Give the slider the stable accessible name Password length, associate the visible label, and expose
its current value as `<n> characters`. Give the switch the accessible name Include symbols.
Both controls support keyboard operation, visible focus and light/dark themes. Native slider
keyboard behavior includes arrows and Home/End; Space toggles the switch. Do not intercept those
keys or move focus when regenerating. Use the existing polite announcement for regeneration;
never announce the generated value through that status region.

The PIN control remains in the picker row and only appears for PIN. All option controls use normal
document flow, with no fixed height. The card retains its widths, padding and typography; long
secrets wrap without truncation, and short viewports scroll without overlapping header or footer.
Keep the selected format's controls visible in a randomness error state, matching the existing format/PIN
controls; Copy and Regenerate stay disabled while there is no password.

### Memorable controls — `src/components/MemorableControl.tsx`, `GeneratorCard.tsx`

Add a presentational `MemorableControl` receiving word count, separator and their change callbacks.
Render it only for `memorable`, in the same position below the picker as Custom Password's controls.
Use two stacked rows:

1. A visible `Words: 6` label (number reflects state), followed by a full-width native range input
   with `min=4`, `max=8`, `step=1`, endpoint captions 4 and 8, accessible name Words and value text
   `<n> words`. Associate the visible label with the input.
2. A visible Separator label and a Headless UI RadioGroup with three options: Space, Hyphen (-)
   and Underscore (_). Use the current PIN segmented-control pattern with checked and focus states.
   Give the group the accessible name Separator and each option its visible accessible name.
   At narrow widths, allow options to stack so the labels remain readable without overflowing.

Both controls retain focus through regeneration. The slider supports arrows and Home/End;
the separator group uses Headless UI's keyboard interaction. Match light/dark themes, visible
focus and regeneration announcements to the existing controls. Returning to Memorable restores
the current page's word count and separator. Reload resets them to six and hyphen.

### Secret display and speech — `SecretDisplay.tsx`, `src/lib/spell.ts`

Keep the generated string intact through display and copy: no trimming, separator replacement or
line-break insertion. Preserve space separators in the rendered text (using `whitespace-pre-wrap`
alongside existing wrapping), allow long eight-word results to wrap, and never truncate them.
The normal copy action copies the exact state string; soft visual wrapping adds no characters.
Keep `translate="no"` and the existing Memorable translation comment.

Add `' ': 'space'` to spoken character names, so the space option is audible. Existing dash,
underscore and capital-letter names already cover the remaining formatting. The polite status
region still announces only generation/copy feedback, not the generated secret.

### Related copy — footer, apps dialog and documentation

- Retain the EFF footer attribution, `EFF_WORDLIST_URL`, apps dialog's Six formats feature and
  memorable-phrase copy: they still describe the available formats.
- `README.md`: retain six formats and the EFF credit/testing reference; describe both configurable
  formats, defaults, exact Memorable formatting and page-session lifetime; rename the Password exclusions note.
- `AGENTS.md` and `LICENSE`: no changes are needed. The wordlist remains and the storage and native-parity
  rules still apply. This design introduces no additional Tailwind Plus-derived files.

## Security

- All generation uses the existing secure randomness module. No fallback randomness, raw biased
  modulo selection, persistence or logging of generated secrets is allowed.
- The lower limit of 6 is an explicit user requirement; short custom passwords have substantially
  less entropy than the default. The UI reports the selected configuration's approximate entropy
  without labeling every permitted setting strong or good.
- No new storage keys, network requests, runtime dependencies, downloads, inline scripts,
  HTML style attributes, data URIs or HTML injection. Native inputs and existing Headless UI
  components work under the production CSP; do not loosen headers to accommodate them.
- Memorable chooses every word and the suffix independently through rejection sampling. It does not
  filter duplicates, change the EFF vocabulary or count capitalization/separator choices as entropy.
- Invalid Custom Password and Memorable inputs are rejected; randomness failures continue to show no usable secret.
- Keep the clipboard safeguards and translation opt-out intact.

## Testing

Core changes are test-first. Tests remain colocated, import Vitest explicitly, and component tests
use the jsdom environment comment.

**Core and preferences:**

- Assert the six format IDs, groups and labels; defaults; retained Memorable selection; and the existing
  Password, PIN and hex behavior.
- Exercise every integer length 6–32 with symbols both on and off, checking exact lengths,
  allowed alphabets and all required classes. Confirm symbols never appear when disabled.
- Reject 5, 33, fractional values, NaN, infinities and runtime values of the wrong type.
- Exercise every word count 4–8 with all three separators. Check selected entry count, first-letter
  capitalization, exact joining, three suffix digits and alphabet membership. Do not count words by
  blindly splitting on hyphens; EFF entries can themselves contain hyphens.
- Use deterministic draws to cover all four internally hyphenated entries, repeated words and suffixes
  000, 007, 042 and 999. Verify no extra separator at either end, and that changing join separators
  never edits an entry's own hyphens. Retain existing seeded uniformity and rejection-sampling
  coverage for 7,776 choices and extend it to the 1,000-value suffix range.
- Reject word counts 3, 9, fractional values, NaN, infinities and wrong runtime types; reject empty,
  multiple-space, tab, newline and other unsupported separators.
- Verify each format reads only its own options: PIN, custom and Memorable settings cannot change
  unrelated generation or entropy.
- Verify both entropy formulas, approximate formatting, endpoint/default vectors and unchanged
  values for Password, PIN and secrets. Verify exact Memorable entropy for all five word counts
  and independence from separator. Keep all existing wordlist integrity expectations.
- Verify saved `standard`, `strong` and `memorable` restore, and blocked or
  invalid storage continues to work.

**Hook and components:**

- Custom controls appear only for Custom Password, with length 24 and symbols on initially.
- Memorable controls appear only for Memorable, with six words and hyphen initially.
- Changing any option regenerates with the correct options and refreshes entropy and feedback;
  no-op changes do not. Settings survive format switches and reset on remount.
- Only the two permitted preference keys are written. Neither custom/Memorable settings nor secrets persist.
- Deferred copy feedback cannot mark a regenerated password as copied. Generation failures after
  a control change remove the secret and show the existing error state.
- The picker uses the new names and retains Memorable. The EFF footer credit remains.
- Spaces are spoken explicitly, capitalization and all separators are announced correctly, and
  copied strings preserve every separator and leading-zero suffix digit.

**Playwright against production preview:**

- Operate both sliders by keyboard, including Home/End, toggle symbols with Space, and select all
  separators using the keyboard. Verify focus remains on the control, selected values match output,
  and copy returns the current result.
- Verify a saved Memorable selection restores, and reload resets custom/Memorable settings while retaining
  the selected format.
- At 320 × 640, Custom Password with 32 characters and Memorable with eight words (all three
  separators, including deliberately long selected entries) have no horizontal overflow or clipped controls;
  the whole card remains reachable by page scrolling. Check the existing desktop centring and
  short-viewport behavior with the added controls.
- Copy a space-separated Memorable result and verify the exact original string, including its
  final separator and three-digit suffix, regardless of visual wrapping.
- Exercise all controls with zero CSP/Trusted Types violations or console errors. Retain the
  existing build-output, apps-dialog, clipboard and secret-wrapping coverage.

Visually inspect light and dark themes at 320, 768 and 1280 px. Before implementation is called done,
`npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` must all pass.

## Binding spec changes

Apply these edits to `docs/2026-09-26-pyrgus-web-spec.md` with the corresponding implementation:

1. **Non-goals:** replace PIN being the only configurable format with the allowed Custom Password
   length/symbol controls, Memorable word-count/separator controls and PIN lengths; broader
   customization remains out of scope.
2. **Formats:** retain six formats, rename Standard to Password and Strong to Custom Password in
   visible-name descriptions, and make Password the default. Specify Custom Password's 6–32 range,
   24/on defaults, both alphabets and required classes, and no grouping. Retain Password's exclusions
   and 18 characters plus two grouping dashes. Replace Memorable's row/sample with 4–8 EFF entries
   (default six), initial-letter capitalization, a 000–999 suffix and the three separator choices
   (default hyphen). Define retained internal hyphens, repeats and a separator before the suffix.
3. **Generator core / API:** retain all six IDs and WordSpec; extend Options with `customLength`,
   `includeSymbols`, `memorableWordCount` and `memorableSeparator`. Update WordSpec's count,
   capitalization, suffix and separator fields as specified above. Document defaults, validation
   and which specs read which options. Replace the only-PIN-reads-options statement.
4. **Generation / Entropy:** update Memorable generation to the selected count, capitalization,
   separator and three-digit suffix. Set its exact entropy to `n × log2(7776) + log2(1000)` and list
   all five display values above; do not count case or separators as randomness. Describe Custom
   Password using the existing character algorithm and both length-dependent entropy formulas.
   Clarify that its figures are approximate upper bounds; remove the blanket marginal-difference
   claim and the obsolete exact-output-count description where it applies to these estimates.
   Retain `~` and round-down formatting. Rename Standard's visible-name references to Password.
5. **Wordlist / Cross-platform test vectors:** retain EFF source, attribution, order, checksum and
   its four internally hyphenated entries. Document version-2 metadata, default Memorable entropy,
   six custom length/symbol cases, five Memorable entropy cases and deterministic formatting cases.
   Keep the cross-platform comparison requirement.
6. **Generator card / State / Accessibility / Clipboard:** update picker labels and groups; describe
   both formats' conditional controls, labels and keyboard behavior. Add all four hook state fields/setters,
   immediate regeneration, page-lifetime retention, reload defaults and copy-feedback invalidation.
   Document saved-ID compatibility, including Memorable. Extend references to format/PIN changes
   to include custom and Memorable changes where applicable. Specify exact spaces in display/copy
   and the spoken name space. Retain the Memorable translation example and translation opt-out.
7. **Repository documentation / Project structure:** add `CustomPasswordControl.tsx` and
   `MemorableControl.tsx`; describe six formats and session-only custom/Memorable settings in the
   README outline. Keep wordlist references, EFF credits, apps-dialog copy, AGENTS.md and LICENSE.
8. **Testing / Manual launch checks:** update obsolete format names and Memorable expectations;
   add the generation, validation, entropy, preferences, accessibility, layout and failure coverage
   above. Retain wordlist integrity checks. Rename the manual Standard VoiceOver check to Password
   and include both formats' controls and spoken spaces.
9. **Native parity follow-up:** record the required native changes and vector-version update as
   pending work in the separate repo; preserve the historical PIN follow-up.
10. **README.md itself:** keep the six-format table with the new names; describe Custom Password as 6–32
    characters with optional symbols, 24/on by default, and configuration-dependent approximate
    entropy (`~149` at default). Describe Memorable's 4–8 words, default six, first-letter capitalization,
    three-digit suffix, separator choices and entropy range (61.7–113.4 bits, default 87.5).
    State that only format and PIN length persist; custom and Memorable options reset on reload.
    Retain EFF credits and wordlist testing references, and rename the exclusions note.
