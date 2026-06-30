# MVP Manual Test

This guide verifies the first Dew MediArchive MVP as a real browser extension.

## What This Test Proves

This test proves:

- the extension build output can be loaded into Chromium
- the background worker can observe media-like network requests
- the popup can read detected media for the current tab
- the Copy button can place a candidate URL on the clipboard
- a copied candidate URL can be tested manually with `yt-dlp`

This test does not prove:

- automatic downloading
- desktop app behavior
- Safari support
- DRM or protected platform support

## Prerequisites

Install these locally before testing the full copy/download loop:

```bash
yt-dlp --version
ffmpeg -version
```

Current workspace check:

```text
yt-dlp: 2026.06.09
ffmpeg: 8.1.2
```

The extension can still be built and loaded without those tools. They are only needed for the final manual download verification step.

## Build The Extension

From `apps/extension`:

```bash
npm install
npm run test
npm run typecheck
npm run build
```

Expected build output:

```text
apps/extension/dist/manifest.json
apps/extension/dist/background.js
apps/extension/dist/popup.html
apps/extension/dist/popup.js
apps/extension/dist/assets/
```

## Load In Chromium

1. Open Chrome, Brave, or Edge.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click Load unpacked.
5. Select:

```text
apps/extension/dist
```

6. Pin Dew MediArchive in the toolbar if needed.

## Test Detection

1. Open a page with authorized non-DRM media.
2. Start playback.
3. Watch for the Dew extension badge to show a count.
4. Open the Dew popup.
5. Confirm detected candidates appear.
6. Click Copy on a candidate.

## Test Download Manually

After copying a candidate URL:

```bash
yt-dlp "PASTED_URL"
```

Expected result:

- `yt-dlp` recognizes the URL or stream.
- a media file downloads, or a clear failure reason appears.

Record the result in `changelog.md`.

## Local Smoke Result

The local media-download leg has been verified with a generated one-second MP4:

```text
source: http://127.0.0.1:8765/sample.mp4
tool: yt-dlp 2026.06.09
output: /private/tmp/dew-mediarchive-smoke/downloaded.mp4
duration: 1.000000
size: 17122 bytes
```

Headless Chrome also requested the local smoke-test page and `sample.mp4`. Full popup-visible proof should still be performed in a normal Chromium window because the MV3 service worker was too ephemeral to inspect reliably in the headless DevTools run.

Chrome for Testing has since verified more of the flow:

```text
popup verification URL: popup.html?tabId=<smoke-tab-id>
rendered: 1 item found, MP4 video, 127.0.0.1/sample.mp4, Copy
yt-dlp output: /private/tmp/dew-mediarchive-smoke/downloaded-from-popup-proof.mp4
duration: 1.000000
size: 17122 bytes
```

That explicit `tabId` URL is only for automation/debugging. The real first-user proof is still opening Dew from the toolbar while the media page is active.

## Failure Notes

If the popup is empty:

- reload the media page
- start playback again
- confirm the site is not a blocked/DRM-heavy platform
- try opening the popup after the video has started loading

If Copy fails:

- click Copy again
- check whether the popup shows `Copy failed. Try again.`

If `yt-dlp` fails:

- the URL may be expired
- the stream may require session headers or cookies
- the source may not be supported yet
- the copied item may not be the best candidate from the page
