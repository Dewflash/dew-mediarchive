# Dew MediArchive

Dew MediArchive is a local-first media archiving tool. The first milestone is a Chromium browser companion that detects common non-DRM media URLs on the current page and lets the user copy them for manual download verification.

## MVP Scope

The MVP should:

- Build as a Chromium Manifest V3 extension.
- Detect common media request URLs such as `.mp4`, `.webm`, `.m3u8`, and `.mpd`.
- Store detected media per tab.
- Show a badge when candidates are found.
- List candidates in the popup.
- Copy a detected media URL for manual `yt-dlp` testing.
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
5. Visit a page with authorized non-DRM media.
6. Start playback.
7. Open the Dew popup.
8. Copy a detected media URL.
9. Test it manually with `yt-dlp`.

## Extension Commands

From `apps/extension`:

```bash
npm install
npm run typecheck
npm run build
```

Load `apps/extension/dist` as the unpacked extension after a successful build.
