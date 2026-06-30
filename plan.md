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

## Next Steps

1. Scaffold `apps/extension` with TypeScript, Vite, React, and Manifest V3.
2. Add shared media detection types.
3. Add URL classification helpers and tests.
4. Add background request listener and per-tab storage.
5. Add popup UI with copy action.
6. Add badge updates.
7. Build and typecheck.
8. Document load-unpacked and manual `yt-dlp` verification.

## Open Questions

- Whether to add a local receiver immediately after copy verification succeeds.
- Which sample non-DRM pages should become the first manual test set.
