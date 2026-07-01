# Verification

## MVP Done Criteria

- Extension builds.
- Extension loads as an unpacked Chromium extension.
- Badge updates when supported media candidates are detected.
- Popup lists detected media for the current tab.
- Copy button writes the media URL to the clipboard.
- At least one copied non-DRM media URL downloads successfully with `yt-dlp`.
- Save button sends a detected candidate to the local receiver.
- Local receiver accepts a non-DRM media URL and saves a file with `yt-dlp`.
- Receiver job records expose `yt-dlp` progress when progress is available.
- Popup renders Save progress when the receiver reports it.
- Completed receiver saves create archive metadata with file hash and size.
- Local library renders saved archive records.
- Local library supports search, filtering, sorting, and export links.
- Archive metadata exports are available as JSON and CSV.
- Duplicate source saves reuse an existing archive record instead of downloading the same source again.
- Unsupported sources are shown or filtered intentionally.

## Static Checks

Run from `apps/extension`:

```bash
npm run test
npm run typecheck
npm run build
```

Run from `apps/receiver`:

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
9. Save a media candidate while the local receiver is running.
10. Confirm the receiver records `queued -> downloading -> completed`.
11. Confirm the saved media file exists.
12. Confirm `GET /archive` lists the completed save.
13. Open `http://127.0.0.1:47321/library`.
14. Confirm the saved item appears.
15. Try a library search/filter/sort query.
16. Confirm exports respond:

```bash
curl http://127.0.0.1:47321/export/archive.json
curl http://127.0.0.1:47321/export/archive.csv
```

17. For Copy fallback, run:

```bash
yt-dlp "PASTED_URL"
```

18. Record result in `changelog.md`.

## Current Runtime Proof

Static checks pass, and the extension build output exists. `yt-dlp` and `ffmpeg` are installed locally.

Verified:

- local MP4 fixture generated with `ffmpeg`
- localhost media server served `sample.mp4`
- `yt-dlp` downloaded the local MP4 successfully
- downloaded file probes as 1.000000 seconds and 17122 bytes
- headless Chrome requested the local smoke-test page and media file
- automated popup tests prove snapshot rendering and clipboard success/failure behavior
- automated popup tests prove visible candidates remain available if the tab snapshot clears while the popup is open
- Chrome for Testing loaded the rebuilt extension from `apps/extension/dist`
- Chrome for Testing loaded the local smoke page and requested `sample.mp4`
- extension session storage contained exactly one `MP4 video` candidate for `http://127.0.0.1:8765/sample.mp4`
- the runtime candidate used `page-video-element` provenance from the content-script fallback
- explicit-tab popup verification rendered the stored smoke candidate with `1 item found`, `MP4 video`, `127.0.0.1/sample.mp4`, and a `Copy` button
- automated Copy clicks are blocked by Chrome clipboard rules and correctly show `Copy failed. Try again.`
- the exact rendered candidate URL downloaded successfully with `yt-dlp`
- downloaded popup-proof file probes as 1.000000 seconds and 17122 bytes
- extension tests passed: 5 files, 34 tests
- extension typecheck passed
- extension build passed
- popup Save tests prove receiver POST, completed save state, receiver unavailable state, and receiver failure retry state
- receiver tests passed: 1 file, 11 tests
- receiver typecheck passed
- receiver build passed
- receiver health endpoint returned `{ ok: true, name: "dew-mediarchive-receiver", version: "0.1.0" }`
- receiver accepted the MDN flower MP4 URL as a download job
- receiver completed the job through `yt-dlp`
- receiver output file probes as 5.055000 seconds and 1128375 bytes
- manual extension Save smoke saved the MDN flower MP4 to `/private/tmp/dew-save-test/flower-[flower].mp4`
- manual extension Save smoke job history recorded `queued -> downloading -> completed`
- receiver tests prove completed saves append archive records with output path, byte size, and SHA-256
- receiver tests prove `/library` renders empty and populated states
- receiver tests prove `/library` escapes untrusted archive metadata
- user manually confirmed `/library` shows the saved MDN flower archive item after the receiver was rebuilt/restarted and a new archive-backed Save existed
- receiver tests prove `/library` search, kind filtering, and sort query handling
- receiver tests prove JSON and CSV archive exports
- receiver tests prove CSV formula escaping
- receiver tests prove duplicate source saves reuse an existing archive record
- popup tests prove completed saves link to the local library
- popup tests prove duplicate saves show an already-saved state
- popup tests prove Save progress renders as a progress bar with byte/speed/ETA details
- receiver tests prove `yt-dlp` progress-template parsing and job progress exposure
- `npm run dew:check` passed on a throwaway port outside the sandbox
- `npm run dew` launched the receiver on a throwaway port, and `/health`, `/library`, plus `/export/archive.json` responded
- a real `yt-dlp` smoke against the larger Blender Big Buck Bunny MP4 emitted progress-template lines from 0% to 100%
- a full receiver API smoke on a throwaway port saved the larger Blender Big Buck Bunny MP4 and recorded progress snapshots from 0% through 100% in `jobs.jsonl`

Pending:

- human-click Copy button proof from the real toolbar popup
- packaged receiver/app launch flow

## Automation Limitation

Playwright-based extension inspection was attempted after the local smoke test. It could not complete in this environment:

- Playwright's bundled Chromium was not installed.
- System Chrome launched through Playwright failed because macOS denied Chrome Crashpad access from the sandboxed automation process.
- Headless Chrome could load the extension and page, but the MV3 service worker became idle before session storage could be inspected reliably.

Chrome for Testing can load the unpacked extension and verify stored media plus explicit-tab popup rendering. It could not open the real toolbar popup through `chrome.action.openPopup()` in this environment because Chrome reported no active browser window. Normal Google Chrome launched from this sandbox did not expose the unpacked Dew extension target.

Use a normal Chromium window for the remaining real toolbar-popup proof.
