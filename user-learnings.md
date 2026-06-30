# User Learnings

This file explains important Dew MediArchive decisions in plain language. It is meant to help the owner understand why the project is built this way, not just what changed.

## Why Start With Chromium Instead Of Safari

Chromium browsers such as Chrome, Brave, and Edge let us load an unpacked extension directly from a local folder. That makes the first MVP fast to build and test.

Safari extensions are harder because they need an Apple app and Xcode extension wrapper. Safari can come later, but starting there would slow down the core proof: can Dew detect useful media URLs?

## Why The MVP Detects And Copies Before It Downloads

The biggest product risk is media detection. If Dew cannot see useful media candidates on real pages, a polished app will not matter.

The first MVP therefore proves this smaller flow:

```text
browser sees media -> Dew detects URL -> popup shows candidate -> user copies URL -> yt-dlp verifies download
```

Once that works, the next phase can replace Copy with Save:

```text
popup Save button -> local receiver -> yt-dlp downloads automatically
```

## Why Documentation Comes Before More Code

Dew can easily become messy because it touches browsers, media URLs, local files, future download jobs, and privacy-sensitive page context. The docs give future work rails:

- what the product is
- what is intentionally unsupported
- how the pipeline should be separated
- how to verify progress
- what decisions should not be relitigated without evidence

## Why We Treat YouTube And DRM Platforms As Unsupported

Dew is meant to become a legitimate local media archiving product. Supporting YouTube downloads or DRM bypassing would create product, legal, and platform-distribution risk.

The safer product rule is:

```text
Dew archives authorized non-DRM media.
Protected or restricted platforms are explicit unsupported states.
```

## Why The Project Uses A Pipeline Shape

The final product should not have one giant function that tries to "download a URL." That becomes impossible to reason about.

Instead, the product should grow as a pipeline:

```text
detect -> classify -> normalize -> queue -> download -> hash -> store -> index -> present
```

The MVP implements only:

```text
detect -> classify -> normalize -> present/copy
```

This keeps early work small while still pointing toward the full product.

## Why Phase 1 Is Only A Shell

The first extension commit should prove the browser extension can build and load. It does not need detection yet.

This separation keeps bugs easier to understand:

```text
Phase 1 problem: can the extension build?
Phase 2 problem: are media records shaped correctly?
Phase 3 problem: can the extension detect media requests?
```

If all of those are mixed into one first commit, it becomes harder to know which layer broke.

## What The First Typecheck Failure Taught Us

The first `npm run typecheck` failed because `vite.config.ts` uses Node concepts such as path resolution, while the TypeScript config only knew about browser and Chrome extension types.

The fix was to add Node type context. That is better than disabling strict checks because it keeps TypeScript useful while accurately describing the environment for each file.

## Why Phase 2 Adds Types Before Detection

It is tempting to jump straight into scanning browser requests, but that usually creates messy handoffs like "just pass this URL string to the popup."

Dew needs more than a URL:

- where it came from
- when it was detected
- what kind of media it appears to be
- whether it is supported or blocked
- which detector version found it

That is why Phase 2 adds the shared model first. Phase 3 can now focus on detection behavior while emitting product-shaped records from the start.

## Why Phase 3 Tests The Classifier Before Browser Scanning

The browser will produce a lot of noisy requests: scripts, images, analytics, media chunks, playlists, and platform URLs. Before listening to live browser traffic, Dew needs a small decision function that can answer:

```text
Is this useful media?
Is this unsupported?
Should we ignore it?
```

This is why Phase 3 adds a tested classifier first. The tests prove common cases:

- `.m3u8` becomes an HLS candidate
- `.mpd` becomes a DASH candidate
- `.mp4` becomes a video candidate
- `.ts` chunks are ignored
- YouTube-style hosts are blocked
- premium streaming hosts are DRM-likely unsupported
- `blob:` URLs are unsupported because they are not real downloadable network URLs

## Why Phase 4 Uses Browser Session Storage

The extension has two main surfaces:

```text
background worker: watches network requests
popup: shows what was found
```

Those two surfaces need to share state. For the MVP, Dew uses Chrome session storage so detected media is available to the popup but not saved permanently in the browser.

That is a privacy-friendly MVP choice:

```text
close/reload browser session -> temporary detection state can disappear
future desktop app -> owns durable archive history
```

## What The Phase 4 Typecheck Failure Taught Us

The browser may provide request context fields that the installed TypeScript package does not model on the exact event type we used.

Instead of turning off type safety, we narrowed the mismatch:

```text
this request detail may optionally include documentUrl
```

That keeps the rest of the Chrome API typing strict while acknowledging a small runtime/type-package gap.

## Why Phase 4 Added A Per-Tab Write Queue

When a video starts playing, the browser may fire several matching network requests very quickly. If two detections update storage at the same time, this bad sequence can happen:

```text
request A reads old snapshot
request B reads old snapshot
request A writes media A
request B writes media B
media A is accidentally lost
```

The fix is a small per-tab write queue. For each tab, Dew applies snapshot updates one at a time.

That keeps the MVP reliable without introducing a database yet.

## Why Phase 5 Uses The Same Snapshot Store In Popup And Background

The popup should not re-detect media. Detection belongs to the background worker because it sees network requests as they happen.

The popup's job is simpler:

```text
read current tab snapshot
show what the background found
copy candidate URLs
show unsupported/failure states
```

That is why Phase 5 moved the storage key into a shared helper. If the background and popup each invented their own storage key, a tiny mismatch would make the popup look empty even when detection worked.

## Why Copy Failure Is A Real State

Clipboard access can fail. The user might be in a browser context where copying is blocked or interrupted.

Instead of pretending Copy always works, the popup now has:

```text
Copied
Copy failed. Try again.
```

That follows the project rule that buttons should not silently do nothing.

## Why Static Checks Are Not The Same As Runtime Proof

So far, the code can pass:

```text
npm run test
npm run typecheck
npm run build
```

That proves the source code, types, bundle, and classifier tests are healthy.

It does not prove that a real browser page has produced a downloadable media URL yet.

The next kind of proof is manual runtime proof:

```text
load extension in Chrome
play authorized non-DRM media
copy candidate URL
run yt-dlp on that URL
confirm a file downloads
```

The media-tool part is now proven locally: `yt-dlp` downloaded a generated one-second MP4 from a localhost server, and `ffprobe` confirmed the downloaded file.

The remaining proof is browser UI proof:

```text
load extension in normal Chrome
play media
see the popup candidate
click Copy
paste the copied URL into yt-dlp
```

## What The Headless Chrome Smoke Test Taught Us

Headless Chrome can load the built extension and request the local smoke-test media page. The local server saw requests for both `index.html` and `sample.mp4`.

However, Manifest V3 service workers are short-lived. Dew's service worker appeared as a DevTools target, then went idle before storage inspection was reliable.

That means headless Chrome gave partial proof:

```text
extension build loads
local media page loads
browser requests media
yt-dlp can download copied-style media URL
```

It did not fully prove:

```text
popup visibly shows candidate
Copy button works from real popup
```

Those should be checked in a normal Chromium window next.

## Why The Remaining Test Is Manual

We tried to automate the popup proof with Playwright. Two environment limits got in the way:

- Playwright's bundled Chromium browser is not installed here.
- System Chrome launched through Playwright is blocked by macOS Crashpad permissions in this sandbox.

That does not mean Dew failed. It means this environment cannot reliably inspect the extension popup through Playwright right now.

The next proof should be done in a normal Chrome window:

```text
chrome://extensions
Load unpacked -> apps/extension/dist
open local or real authorized media page
start playback
open Dew popup
confirm candidate appears
click Copy
run yt-dlp on pasted URL
```

## Why We Added More Tests Even Though The Popup Proof Is Still Manual

The visible Chrome smoke test proved that the temporary browser could load the local page and request `sample.mp4`, but the remaining popup proof still needs a normal human-visible interaction.

Rather than pretending that was complete, we strengthened the automated tests around the important background pipeline:

```text
browser request -> DetectedMedia record -> session snapshot -> badge count
```

The new tests cover:

- supported media requests becoming candidates
- non-media requests being ignored
- blocked platforms becoming unsupported records
- snapshots storing detected media
- duplicate media being updated by ID
- concurrent detections not overwriting each other
- badge counts only counting supported candidates
- clearing tab snapshots

## What The Test Typecheck Failure Taught Us

The new tests passed at runtime first, but TypeScript failed because the fake Chrome request objects were missing a field from the Chrome API type.

That was useful. It means the tests were not accurately shaped like real browser events yet.

The fix was to make the mocks match the type instead of weakening the production code. This keeps the tests honest.
