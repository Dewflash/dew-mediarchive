# Plan

## Current Phase

MVP archive records.

## Current Goal

Turn completed local saves into durable archive metadata that future library/search/export surfaces can read.

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
- Stabilized the popup so a visible media list stays available while the popup is open, even if the tab's temporary snapshot clears underneath it.
- Verified the stable popup behavior with `npm run test`, `npm run typecheck`, and `npm run build`.
- Scaffolded `apps/receiver` as a local TypeScript service using Node's built-in HTTP server.
- Added receiver endpoints for `/health`, `/downloads`, and `/downloads/:id`.
- Added download-job validation for JSON bodies, HTTP/HTTPS URLs, optional page metadata, and media kind.
- Added an append-only JSONL job store.
- Added a `yt-dlp` downloader that spawns the binary with argument arrays rather than shell command strings.
- Verified the receiver with `npm run test`, `npm run typecheck`, and `npm run build`.
- Smoke-tested the receiver with the MDN flower MP4 and verified the saved output with `ffprobe`.
- Added a Save button beside Copy for candidate media in the popup.
- Added a popup receiver client that posts to `http://127.0.0.1:47321/downloads` and polls job status.
- Added Save states for queued, downloading, completed, receiver unavailable, and receiver failure.
- Kept Copy available as the fallback action.
- Added abort handling so active Save polling is cancelled when the popup closes.
- Added popup tests for Save request shape, saved state, receiver unavailable state, and receiver failure retry state.
- Verified the Save wiring with `npm run test`, `npm run typecheck`, and `npm run build`.
- Manually smoke-tested extension Save with the MDN flower MP4 and confirmed `/private/tmp/dew-save-test/flower-[flower].mp4` plus `queued -> downloading -> completed` job history.
- Added append-only archive records in `apps/receiver`.
- Added `DEW_ARCHIVE_PATH` and default `.dew/archive.jsonl` storage beside job history.
- Added `GET /archive`.
- Added SHA-256 and byte-size metadata for completed downloads.
- Verified archive records with receiver tests, typecheck, and build.

## Next Steps

1. Improve Save UX with saved output path display.
2. Make the receiver easier to launch outside a terminal.
3. Start a local library/gallery surface backed by `/archive`.
4. Add export for archive metadata.
5. Re-test a short MP4 and a page with multiple videos in normal Chrome.

## Open Questions

- Which sample non-DRM pages should become the first manual test set.
