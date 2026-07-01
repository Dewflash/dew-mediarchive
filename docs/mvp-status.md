# MVP Status

Updated: 2026-07-01

## Current Branch

```text
mvp-extension
```

## What Is Built

- Chromium Manifest V3 extension in `apps/extension`.
- React popup UI.
- Background request detector for HTTP/HTTPS media URLs.
- Content-script fallback that scans page `video`, `audio`, and nested `source` elements.
- Shared media detection model with provenance, status, media kind, and unsupported reasons.
- Per-tab session snapshot storage in `chrome.storage.session`.
- Badge count updates for supported candidates.
- Popup states for loading, empty, error, candidates, unsupported media, Copy success, and Copy failure.
- Popup Save action for candidate media.
- Popup Save states for receiver unavailable, queued, downloading, completed, and failed jobs.
- Copy remains available as a fallback beside Save.
- Popup Save polling is cancelled when the popup closes.
- Open popup keeps the last non-empty media list visible even if the temporary tab snapshot clears.
- Explicit popup verification URL: `popup.html?tabId=<tab-id>`.
- Local receiver in `apps/receiver`.
- Receiver endpoints for health checks, creating download jobs, listing jobs, and reading a job by id.
- Receiver validation for JSON bodies, HTTP/HTTPS media URLs, optional page metadata, and media kind.
- Receiver `yt-dlp` downloader that saves files locally without shell command interpolation.
- Append-only receiver job history in JSONL.
- Append-only archive metadata in JSONL for completed saves.
- Archive endpoint at `GET /archive`.
- Archive records include source URL, page context, output path, byte size, and SHA-256 hash.
- Manual verification guide in `docs/mvp-manual-test.md`.
- Architecture, adapter, archive, security, verification, learning, and changelog docs.

## What Is Proven

- Extension `npm run test` passes: 5 files, 34 tests.
- `npm run typecheck` passes.
- `npm run build` passes.
- The extension builds to `apps/extension/dist`.
- Chrome for Testing can load the built unpacked extension.
- The local smoke page requests `sample.mp4`.
- Dew stores exactly one `MP4 video` candidate for the smoke page.
- The stored candidate uses `page-video-element` provenance from the content-script fallback.
- `popup.html?tabId=<smoke-tab-id>` renders the stored candidate:

```text
1 item found
MP4 video
127.0.0.1/sample.mp4
Copy
```

- Automated Copy clicks can be blocked by Chrome, and Dew shows `Copy failed. Try again.`
- Popup unit tests prove a visible media list is not removed when the tab snapshot clears while the popup is open.
- The exact rendered candidate URL downloads successfully with `yt-dlp`.
- The downloaded proof file probes as:

```text
duration=1.000000
size=17122
```

- Receiver `npm run test` passes: 1 file, 7 tests.
- Receiver `npm run typecheck` passes.
- Receiver `npm run build` passes.
- Receiver smoke test saved the MDN flower MP4 through `yt-dlp`.
- The receiver smoke output probes as:

```text
duration=5.055000
size=1128375
```

- Manual extension Save smoke test saved the MDN flower MP4 to:

```text
/private/tmp/dew-save-test/flower-[flower].mp4
```

- The Save smoke job history recorded:

```text
queued -> downloading -> completed
```

- Receiver tests prove completed downloads write archive records.

## What Is Not Done Yet

- Human Copy proof from the real toolbar popup is not complete.
- Desktop app wrapper is not built.
- Safari support is not built.
- Final content-addressed object storage, search, import/export, and gallery views are not built.
- YouTube and DRM-heavy platforms remain intentionally unsupported.

## Why The Remaining Copy Proof Is Still Open

Automation hit browser and OS limits during earlier popup checks:

- `chrome.action.openPopup()` in Chrome for Testing returned `Could not find an active browser window`.
- Screen capture for toolbar evidence failed in this environment.
- Normal Google Chrome launched from this sandbox did not expose the unpacked Dew extension worker through DevTools.
- Automated clipboard writes from an extension page were blocked by Chrome.

The normal toolbar popup path is now proven for Save by the MDN flower smoke test. The remaining human-visible Copy fallback check is:

```text
load apps/extension/dist in Chrome
open the smoke page or another authorized non-DRM page
start playback
open Dew from the toolbar
confirm the candidate appears
click Copy
paste into yt-dlp
confirm download
```

## Recommended Next Phase

Move from developer MVP to personal-tool MVP:

```text
terminal receiver -> packaged local app/service -> archive records -> library view
```

Keep Copy available as the fallback while Save UX is improved.
