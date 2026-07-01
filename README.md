# Dew MediArchive

Dew MediArchive is a local-first media archiving tool. The first milestone is a Chromium browser companion that detects common non-DRM media URLs on the current page and sends approved save jobs to a local receiver that downloads media on the user's machine with `yt-dlp`.

## MVP Scope

The MVP should:

- Build as a Chromium Manifest V3 extension.
- Detect common media request URLs such as `.mp4`, `.webm`, `.m3u8`, and `.mpd`.
- Store detected media per tab.
- Show a badge when candidates are found.
- List candidates in the popup.
- Copy a detected media URL for manual `yt-dlp` testing.
- Run a local receiver on `127.0.0.1` for one-click Save jobs.
- Save approved media through `yt-dlp` without sending URLs to a cloud service.
- Mark obvious unsupported commercial/DRM-heavy platforms as unsupported.

The MVP should not:

- Bypass DRM.
- Download from YouTube or premium streaming platforms.
- Store cookies, tokens, or private page content.
- Include a desktop app, installer, payment, account system, or cloud sync.

## Repository Layout

```text
apps/
  extension/     Chromium extension MVP
  receiver/      Local save receiver MVP

docs/
  architecture.md
  source-adapters.md
  archive-format.md
  security-and-privacy.md
  verification.md

user-learnings.md  Plain-English decision notes for the project owner
```

## First User Flow

1. Build the extension.
2. Open `chrome://extensions`.
3. Enable Developer Mode.
4. Load the built extension folder as an unpacked extension.
5. Double-click `Dew.command` from this repository root.
6. Visit a page with authorized non-DRM media.
7. Start playback.
8. Open the Dew popup.
9. Save a detected media candidate.
10. View saved media in the local library.

## First Save Flow

The local receiver is the save backend:

```text
popup Save -> POST /downloads -> receiver starts yt-dlp -> file saved locally
```

By default, saved files go to `~/Movies/Dew MediArchive`, job history is appended to `~/Movies/Dew MediArchive/.dew/jobs.jsonl`, and completed saves are indexed in `~/Movies/Dew MediArchive/.dew/archive.jsonl`.

Open the local library while the receiver is running:

```text
http://127.0.0.1:47321/library
```

The library supports search, media-type filtering, sorting, and archive exports:

```text
http://127.0.0.1:47321/export/archive.json
http://127.0.0.1:47321/export/archive.csv
```

## Easy Launch

For normal personal use, double-click:

```text
Dew.command
```

This starts the local receiver and opens the library page.

Developer fallback from the repository root:

```bash
npm run dew
```

This builds the receiver, checks that `yt-dlp` is available, verifies the port, prints the local storage paths, and starts the receiver.

To check the launcher without starting the receiver:

```bash
npm run dew:check
```

If the default port is busy, choose another one:

```bash
DEW_RECEIVER_PORT=47322 npm run dew
```

Privacy information is available while the receiver is running:

```text
http://127.0.0.1:47321/privacy
```

## Extension Commands

From `apps/extension`:

```bash
npm install
npm run test
npm run typecheck
npm run build
```

Load `apps/extension/dist` as the unpacked extension after a successful build.

For the full first-user check, follow `docs/mvp-manual-test.md`.

## Receiver Commands

Install `yt-dlp` first if it is not already available:

```bash
brew install yt-dlp
```

From `apps/receiver`:

```bash
npm install
npm run typecheck
npm run build
npm run start
```

Useful environment overrides:

```bash
DEW_DOWNLOAD_DIR=/path/to/downloads
DEW_JOBS_PATH=/path/to/jobs.jsonl
DEW_ARCHIVE_PATH=/path/to/archive.jsonl
DEW_YT_DLP_PATH=/path/to/yt-dlp
DEW_RECEIVER_PORT=47321
```

Smoke check:

```bash
curl http://127.0.0.1:47321/health
curl -X POST http://127.0.0.1:47321/downloads \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4","kind":"mp4"}'
curl http://127.0.0.1:47321/archive
```
