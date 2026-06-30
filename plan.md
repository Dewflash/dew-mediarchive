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

## Next Steps

1. Add URL classification helpers and tests.
2. Add background request listener and per-tab storage.
3. Add popup UI with copy action.
4. Add badge updates.
5. Build and typecheck.
6. Document load-unpacked and manual `yt-dlp` verification.

## Open Questions

- Whether to add a local receiver immediately after copy verification succeeds.
- Which sample non-DRM pages should become the first manual test set.
