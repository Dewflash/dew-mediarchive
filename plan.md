# Plan

## Current Phase

MVP extension foundation.

## Current Goal

Build a loadable Chromium extension that detects common media URLs, shows them in a popup, and supports manual copy-and-download verification with `yt-dlp`.

## Handoff Status

See `docs/mvp-status.md` for the concise done/not-done MVP handoff.

## Completed

- Repository cloned from `Dewflash/dew-mediarchive`.
- Working branch: `mvp-extension`.
- Documentation foundation started.
- Added `user-learnings.md` for plain-English explanations of decisions and implementation steps.
- Scaffolded `apps/extension` as a Chromium Manifest V3 extension with TypeScript, Vite, and a React popup shell.
- Verified Phase 1 with `npm run typecheck` and `npm run build`.
- Added the Phase 2 shared media detection data model.
- Added Phase 3 media URL classification helpers and unit tests.
- Verified Phase 3 with `npm run test`, `npm run typecheck`, and `npm run build`.
- Added Phase 4 background request listener, per-tab session storage, and badge count updates.
- Verified Phase 4 with `npm run test`, `npm run typecheck`, and `npm run build`.
- Added Phase 5 popup snapshot reading, media list rendering, copy action, and copy failure state.
- Verified Phase 5 with `npm run test`, `npm run typecheck`, and `npm run build`.
- Added Phase 6 manual MVP verification guide.
- Confirmed the extension build output exists.
- Installed `yt-dlp` and `ffmpeg` for local verification.
- Verified `yt-dlp` can download a generated local MP4 fixture.
- Confirmed headless Chrome requested the local smoke-test media file.
- Attempted a visible Chrome DevTools smoke test; Chrome loaded the local page and requested `sample.mp4`, but popup-visible proof still requires normal manual interaction.
- Added focused background pipeline tests for request normalization, ignored requests, unsupported sources, session snapshots, concurrent appends, badge counts, and clearing.
- Verified the stronger test suite with `npm run test`, `npm run typecheck`, and `npm run build`.
- Added popup tests for empty state, candidate rendering, Copy success, Copy failure, unsupported media, and live snapshot updates.
- Verified popup behavior with `npm run test`, `npm run typecheck`, and `npm run build`.
- Added a content-script media-element fallback because real MV3 runtime proof showed the network-only listener did not reliably store the local MP4 candidate before the service worker idled.
- Restricted background webRequest detection to `http` and `https` URLs so extension UI assets do not pollute media snapshots.
- Verified the rebuilt extension in Chrome for Testing with a clean profile: the local smoke page requested `sample.mp4`, and extension session storage contained exactly one `MP4 video` candidate from `page-video-element`.
- Verified the page fallback phase with `npm run test`, `npm run typecheck`, and `npm run build`.
- Added an explicit `tabId` popup verification path for automation/debugging while preserving normal toolbar active-tab behavior.
- Verified `popup.html?tabId=<smoke-tab-id>` rendered the stored smoke candidate in Chrome for Testing: `1 item found`, `MP4 video`, `127.0.0.1/sample.mp4`, and `Copy`.
- Confirmed automated Copy clicks are blocked by Chrome clipboard rules and surface the expected `Copy failed. Try again.` state.
- Verified the exact rendered candidate URL downloads with `yt-dlp` and probes as 1.000000 seconds, 17122 bytes.
- Verified this phase with `npm run test`, `npm run typecheck`, and `npm run build`.

## Next Steps

1. Perform normal Chromium load-unpacked testing with the real toolbar popup visible.
2. Confirm the toolbar popup shows the local `sample.mp4` candidate.
3. Confirm a human click on the real popup Copy button copies the candidate URL.
4. Record any manual detection gaps.

## Open Questions

- Whether to add a local receiver immediately after copy verification succeeds.
- Which sample non-DRM pages should become the first manual test set.
