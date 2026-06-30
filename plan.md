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

## Next Steps

1. Add shared media detection types.
2. Add URL classification helpers and tests.
3. Add background request listener and per-tab storage.
4. Add popup UI with copy action.
5. Add badge updates.
6. Build and typecheck.
7. Document load-unpacked and manual `yt-dlp` verification.

## Open Questions

- Whether to add a local receiver immediately after copy verification succeeds.
- Which sample non-DRM pages should become the first manual test set.
