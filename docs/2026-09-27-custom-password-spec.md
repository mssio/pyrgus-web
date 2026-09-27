# Pyrgus Web — Password and Custom Password — Design

**Date:** 2026-09-27
**Status:** Draft
**Amends:** `docs/2026-09-26-pyrgus-web-spec.md` (the binding spec). Apply the amendments below
in the same implementation commits as the behavior they describe.

## Summary

Remove Memorable and offer two password choices: **Password**, the existing Standard preset, and
**Custom Password**, the existing Strong preset with configurable length and symbols. Custom Password
has a length slider from 6 through 32 characters and an Include symbols switch. Its defaults are
24 characters and symbols enabled.

## Intent

**User requests and agreed decisions:**

- Remove the Memorable password option.
- Rename Standard and Strong. After considering Good Password, the user chose the recommended
  names Password and Custom Password.
- Add a 6–32 character slider and an Include symbols toggle to Custom Password.
- Preserve the current Strong defaults: 24 characters, symbols enabled.
- Keep Password as the default, with its existing generation rules.
- Show custom controls below the format picker. Changing either immediately regenerates the
  password and updates its entropy caption.
- Require lowercase, uppercase and digits in Custom Password, plus a symbol when enabled.
- Keep custom settings while switching formats in the current page, but reset them on reload.
- Remove the unused wordlist and its footer credit. A saved Memorable selection falls back to Password.
- Cover keyboard accessibility, mobile layout, generation and security in testing; update the
  shared test vectors and flag the corresponding native-app work separately.

**Implementation choices proposed by this spec:**

- Retain internal IDs `standard` and `strong` for storage compatibility; only their visible labels change.
- Use a native range input and the already installed Headless UI Switch. No additional dependency
  or copied Catalyst component is needed.
- Remove stale Memorable advertising from the apps dialog without making a new claim about the
  native app's format count.
- Preserve the existing character-generation algorithm and approximate entropy convention.

**Success looks like:** the default remains a one-click password generator; selecting Custom Password
exposes two obvious controls, and every displayed or copied result matches their current values.

## Non-goals

- Additional character-class toggles, editable alphabets, grouping controls or a numeric length field.
- Persisting custom settings, generated secrets or password history.
- A new strength meter, strength adjectives or a replacement entropy algorithm.
- Changes to Password's alphabet, grouping or distribution; PIN or secret-key generation; or clipboard timing.
- Native-repository edits, new dependencies, downloads or changes to security headers.
- Rewriting historical implemented specs or plans.

## Design

### Formats and options — `src/core/formats.ts`, `src/core/charsets.ts`

There are five formats, in this order:

| Internal ID | Visible label | Behavior |
| --- | --- | --- |
| `standard` | Password | Existing 18 generated characters, grouped 6-6-6 with two dashes |
| `strong` | Custom Password | 6–32 ungrouped characters; optional symbols |
| `pin` | PIN | Existing 4, 6 or 8 digits, default 6 |
| `secret128` | Secret 128 | Existing 32 lowercase hex characters |
| `secret256` | Secret 256 | Existing 64 lowercase hex characters |

The Passwords picker group contains `standard`, `strong`, `pin`; Secrets contains the two secret
formats. `DEFAULT_FORMAT` remains `standard`. Remove `memorable` from `FormatId`, labels, groups,
specs and validation. Keep the existing `STANDARD_*` and `STRONG_BASE` constants and vector alphabet
keys where they still apply; these internal names do not appear in the UI.

Extend `Options` with required `customLength: number` and `includeSymbols: boolean`, alongside
`pinLength`. Defaults are `{ pinLength: 6, customLength: 24, includeSymbols: true }`. Existing callers
and tests supply complete options, typically by spreading `DEFAULT_OPTIONS`.

Only the `strong` spec reads the custom fields. Its length is an integer from 6 through 32 inclusive.
Reject non-integers, non-finite values and out-of-range lengths, and non-boolean symbol settings,
with a `RangeError` before generation or entropy calculation; do not silently clamp or coerce them.
Other formats ignore the custom fields, just as unrelated options currently do not affect them.

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

Remove `WordSpec`, the `words` generation and entropy cases, wordlist imports, `wordlist.ts` and
`wordlist.test.ts`. Remove Memorable-specific generation and entropy tests. Generic randomness
tests using a range of 7,776 may remain: they test arbitrary ranges independently of the wordlist.

Custom Password's displayed estimate follows the current convention:

- Symbols on: `customLength × log2(75)`.
- Symbols off: `customLength × log2(62)`.
- Display `~` followed by the estimate rounded down; the default remains `~149`.
- Both modes are approximate upper bounds, not exact entropy or the exact logarithm of the valid
  output count. Required classes and the overlapping base alphabet make the output non-uniform.
  Do not describe the difference as necessarily marginal across the new length range.

Other formats retain their current entropy and display rules. The caption remains
`<value> bits of entropy`, with no strength adjective or color judgment.

Increment `src/core/test-vectors.json` to version 2. Remove its `wordlist` metadata and `memorable`
entropy entry. Preserve the existing alphabet keys and default `strong` entropy entry; add a
`custom` object with `minLength: 6`, `maxLength: 32`, `defaultLength: 24`,
`defaultIncludeSymbols: true`, and `cases`. Each case records `length`, `includeSymbols`, `bits`
(rounded to four decimal places) and `display`. Include all six combinations of lengths 6, 24
and 32 with symbols on and off. These explicitly describe both custom modes for native consumers.

The implementation handoff must tell the user that the native repo needs the matching names,
format removal, options and version-2 vectors. Do not edit that repo or claim parity is already restored.

### State and preferences — `src/hooks/usePyrgus.ts`, `src/lib/preferences.ts`

`usePyrgus` owns `customLength` and `includeSymbols` with their defaults and exposes setters alongside
the existing state and actions. Generation and entropy receive the same complete options object.

Changing either custom control updates its value, generates a matching password immediately,
clears copied/copy-failed feedback and announces New password generated. A no-op control event
does not regenerate. Settings remain in hook state when another format is selected; returning to
Custom Password uses them. Reloading restores the default custom settings, even if the saved format
is Custom Password.

Use the existing feedback-version mechanism to ignore an in-flight copy result after a custom
setting changes. As with regeneration today, this does not cancel the clipboard clear scheduled
for a previously copied secret. A generation error clears the displayed password and shows the
existing fail-closed error state, never a stale secret with new control values.

Only `pyrgus.format` and `pyrgus.pinLength` are persisted. Stored `standard` and `strong` remain
valid and display their new names. Stored `memorable`, other invalid values, blocked storage and
missing values use the existing fallback to `standard`. No eager storage rewrite is needed;
the next user format selection writes a valid ID. Never read or write custom settings in storage.

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

The PIN control remains in the picker row and only appears for PIN. Custom controls use normal
document flow, with no fixed height. The card retains its widths, padding and typography; long
secrets wrap without truncation, and short viewports scroll without overlapping header or footer.
Keep the custom controls visible in a randomness error state, matching the existing format/PIN
controls; Copy and Regenerate stay disabled while there is no password.

### Related copy — footer, apps dialog and documentation

- `Footer.tsx`: remove the EFF attribution paragraph, retaining the privacy statement and source link.
- `src/config.ts`: remove the unused `EFF_WORDLIST_URL` export.
- `AppsDialog.tsx`: replace the feature title Six formats with Passwords and secret keys; replace
  its body with `Passwords, PINs, and 128- and 256-bit hex secrets.` The dialog otherwise behaves as before.
- `SecretDisplay.tsx`: remove the obsolete Memorable wording from its translation comment, while
  retaining `translate="no"` on both visible and spoken secret representations.
- `README.md`: describe five formats, the custom options and session lifetime, remove the wordlist
  credit and testing reference, and rename the Password exclusions note.
- `AGENTS.md`: remove `wordlist` from the `src/core/` layout description. Preserve the storage and
  native-parity rules.
- `LICENSE`: no change is required; the existing file contains no EFF exclusion and this design
  introduces no additional Tailwind Plus-derived files.

## Security

- All generation uses the existing secure randomness module. No fallback randomness, raw biased
  modulo selection, persistence or logging of generated secrets is allowed.
- The lower limit of 6 is an explicit user requirement; short custom passwords have substantially
  less entropy than the default. The UI reports the selected configuration's approximate entropy
  without labeling every permitted setting strong or good.
- No new storage keys, network requests, runtime dependencies, downloads, inline scripts,
  HTML style attributes, data URIs or HTML injection. Native inputs and existing Headless UI
  components work under the production CSP; do not loosen headers to accommodate them.
- Invalid custom inputs are rejected; randomness failures continue to show no usable secret.
- Keep the clipboard safeguards and translation opt-out intact.

## Testing

Core changes are test-first. Tests remain colocated, import Vitest explicitly, and component tests
use the jsdom environment comment.

**Core and preferences:**

- Assert the five format IDs, groups and labels; defaults; rejection of Memorable; and the existing
  Password, PIN and hex behavior.
- Exercise every integer length 6–32 with symbols both on and off, checking exact lengths,
  allowed alphabets and all required classes. Confirm symbols never appear when disabled.
- Reject 5, 33, fractional values, NaN, infinities and runtime values of the wrong type.
- Verify custom options do not change other formats and PIN length does not change Custom Password.
- Verify both entropy formulas, approximate formatting, endpoint/default vectors and unchanged
  values for Password, PIN and secrets. Remove obsolete wordlist expectations.
- Verify saved `standard` and `strong` restore, saved `memorable` falls back, and blocked or
  invalid storage continues to work.

**Hook and components:**

- Custom controls appear only for Custom Password, with length 24 and symbols on initially.
- Changing either control regenerates with the correct options and refreshes entropy and feedback;
  no-op changes do not. Settings survive format switches and reset on remount.
- Only the two permitted preference keys are written. Neither custom settings nor secrets persist.
- Deferred copy feedback cannot mark a regenerated password as copied. Generation failures after
  a control change remove the secret and show the existing error state.
- The picker and related copy contain the new names and no Memorable option or EFF footer credit.

**Playwright against production preview:**

- Operate the slider by keyboard, including Home/End, and toggle symbols with Space. Verify
  focus remains on the control, selected values match output, and copy returns the current result.
- Verify a saved Memorable selection falls back, and reload resets custom settings while retaining
  the selected format.
- At 320 × 640, Custom Password with 32 characters has no horizontal overflow or clipped controls;
  the whole card remains reachable by page scrolling. Check the existing desktop centring and
  short-viewport behavior with the added controls.
- Exercise both controls with zero CSP/Trusted Types violations or console errors. Retain the
  existing build-output, apps-dialog, clipboard and secret-wrapping coverage.

Visually inspect light and dark themes at 320, 768 and 1280 px. Before implementation is called done,
`npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` must all pass.

## Binding spec changes

Apply these edits to `docs/2026-09-26-pyrgus-web-spec.md` with the corresponding implementation:

1. **Non-goals:** replace PIN being the only configurable format with the allowed Custom Password
   length/symbol controls and PIN lengths; broader customization remains out of scope.
2. **Formats:** change six formats to five, rename Standard to Password and Strong to Custom Password
   in visible-name descriptions, remove Memorable's row/sample, and make Password the default.
   Specify the 6–32 range, 24/on defaults, both alphabets and required classes, and no custom grouping.
   Retain Password's exclusions and 18 characters plus two grouping dashes.
3. **Generator core / API:** remove WordSpec and wordlist from the tree and union; remove `memorable`
   from FormatId; extend Options with `customLength` and `includeSymbols`. Document retained internal
   IDs, validation and which specs read which options. Replace the seventh-preset example with a
   generic new-preset example.
4. **Generation / Entropy:** remove Memorable generation and calculations. Describe Custom Password
   using the existing character algorithm and both length-dependent entropy formulas. Clarify that
   its figures are approximate upper bounds; remove the blanket marginal-difference claim and the
   obsolete exact-output-count description where it applies to these estimates. Retain `~` and
   round-down formatting. Rename Standard's visible-name references to Password.
5. **Wordlist / Cross-platform test vectors:** remove the Wordlist subsection. Replace wordlist
   checksum coverage with version-2 vector metadata and the six custom length/symbol cases specified
   above. Keep the cross-platform comparison requirement.
6. **Generator card / State / Accessibility / Clipboard:** update picker labels and groups; describe
   the conditional custom controls, labels and keyboard behavior. Add custom hook state/setters,
   immediate regeneration, page-lifetime retention, reload defaults and copy-feedback invalidation.
   Document saved-ID compatibility and the Memorable fallback. Extend references to format/PIN
   changes to include custom changes where applicable. Remove the Memorable-specific translation
   example while preserving the translation opt-out.
7. **Apps dialog / Footer / Hosting consequences:** replace the apps feature's Six formats and
   memorable-phrase copy with the exact copy above; remove the EFF footer item and the EFF example
   from outbound navigation notes. Do not claim the native app already implements these changes.
8. **Repository documentation / Project structure:** remove wordlist files and references; add
   `CustomPasswordControl.tsx`; describe five formats and session-only custom settings in the README
   outline; remove EFF credits from that outline; update the config comment to mention only the repo URL.
   Remove wordlist from the AGENTS layout outline and its actual layout line. Leave LICENSE unchanged.
9. **Testing / Manual launch checks:** replace obsolete names and wordlist checks with the custom
   generation, validation, entropy, preferences, accessibility, layout and failure coverage above.
   Rename the manual Standard VoiceOver check to Password and include Custom Password controls.
10. **Native parity follow-up:** record the required native changes and vector-version update as
    pending work in the separate repo; preserve the historical PIN follow-up.
11. **README.md itself:** use the five-format table and new names; describe Custom Password as 6–32
    characters with optional symbols, 24/on by default, and configuration-dependent approximate
    entropy (`~149` at default). State that only format and PIN length persist; custom settings
    reset on reload. Remove EFF credits and wordlist testing references, and rename the exclusions note.
