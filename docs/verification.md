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
npm run typecheck
npm run build
```

## Manual Browser Check

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

