# Verification

## MVP Done Criteria

- Extension builds.
- Extension loads as an unpacked Chromium extension.
- Badge updates when supported media candidates are detected.
- Popup lists detected media for the current tab.
- Copy button writes the media URL to the clipboard.
- At least one copied non-DRM media URL downloads successfully with `yt-dlp`.
- Unsupported sources are shown or filtered intentionally.

## Static Checks

Run from `apps/extension` once scaffolded:

```bash
npm run test
npm run typecheck
npm run build
```

## Manual Browser Check

See `docs/mvp-manual-test.md` for the full first-user checklist.

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Load the extension build output.
4. Visit a known authorized non-DRM media page.
5. Start playback.
6. Confirm the badge count updates.
7. Open the popup.
8. Copy a media candidate.
9. Run:

```bash
yt-dlp "PASTED_URL"
```

10. Record result in `changelog.md`.

## Current Runtime Proof

Static checks pass, and the extension build output exists. `yt-dlp` and `ffmpeg` are installed locally.

Verified:

- local MP4 fixture generated with `ffmpeg`
- localhost media server served `sample.mp4`
- `yt-dlp` downloaded the local MP4 successfully
- downloaded file probes as 1.000000 seconds and 17122 bytes
- headless Chrome requested the local smoke-test page and media file
- automated popup tests prove snapshot rendering and clipboard success/failure behavior

Pending:

- normal Chromium window load-unpacked test
- popup-visible candidate proof
- manual Copy button proof from popup

## Automation Limitation

Playwright-based extension inspection was attempted after the local smoke test. It could not complete in this environment:

- Playwright's bundled Chromium was not installed.
- System Chrome launched through Playwright failed because macOS denied Chrome Crashpad access from the sandboxed automation process.
- Headless Chrome could load the extension and page, but the MV3 service worker became idle before session storage could be inspected reliably.

Use a normal Chromium window for the remaining popup proof.
