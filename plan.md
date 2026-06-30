# Plan

## Current Phase

MVP extension foundation.

## Current Goal

Build a loadable Chromium extension that detects common media URLs, shows them in a popup, and supports manual copy-and-download verification with `yt-dlp`.

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

## Next Steps

1. Install or make available `yt-dlp` and `ffmpeg` for manual download proof.
2. Perform manual browser testing on known authorized non-DRM media.
3. Record manual test results and any detection gaps.

## Open Questions

- Whether to add a local receiver immediately after copy verification succeeds.
- Which sample non-DRM pages should become the first manual test set.
