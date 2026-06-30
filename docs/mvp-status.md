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
- Open popup keeps the last non-empty media list visible even if the temporary tab snapshot clears.
- Explicit popup verification URL: `popup.html?tabId=<tab-id>`.
- Manual verification guide in `docs/mvp-manual-test.md`.
- Architecture, adapter, archive, security, verification, learning, and changelog docs.

## What Is Proven

- `npm run test` passes: 5 files, 31 tests.
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

## What Is Not Done Yet

- Real toolbar-popup proof in normal Chromium is not complete.
- Human Copy proof from the real toolbar popup is not complete.
- Automatic local Save/download is not built.
- Desktop app/local receiver is not built.
- Safari support is not built.
- Persistent archive storage, hashing, indexing, search, import/export, and gallery views are not built.
- YouTube and DRM-heavy platforms remain intentionally unsupported.

## Why The Remaining Toolbar Proof Is Still Open

Automation hit browser and OS limits:

- `chrome.action.openPopup()` in Chrome for Testing returned `Could not find an active browser window`.
- Screen capture for toolbar evidence failed in this environment.
- Normal Google Chrome launched from this sandbox did not expose the unpacked Dew extension worker through DevTools.
- Automated clipboard writes from an extension page were blocked by Chrome.

The product behavior still needs a normal human-visible check:

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

Do the real manual toolbar check first. If it passes, build the local receiver and replace the MVP Copy loop with a Save flow:

```text
popup Save -> local receiver -> yt-dlp job -> file saved locally
```

If the toolbar check fails, fix that before adding Save.
