# Learnings

## Durable Decisions

- Start with Chromium, not Safari. Chromium supports fast unpacked extension testing; Safari requires an Apple app and Xcode extension wrapper.
- Start with detect-and-copy, then add automatic save. Detection quality is the core product risk.
- Shape the MVP around final data models so the detector can feed the later desktop app.
- Treat YouTube and premium streaming platforms as unsupported in the product path.
- The sellable product is the desktop media archive app; the extension is a companion capture surface.
- Vite config files use Node APIs, so the extension TypeScript config must include Node type context alongside Chrome extension types.
- Define shared media records before detector behavior so extension layers and the later desktop app do not drift into incompatible shapes.
- Classify blocked/DRM-likely domains before extension matching so a protected platform URL cannot look supported just because it has a familiar media-looking path.
- Ignore segment files such as `.ts` and `.m4s` in the generic classifier because playlist/manifest URLs are more useful for `yt-dlp` than individual chunks.

## Mistakes To Avoid

- Do not turn detection, downloading, metadata, and UI into one function.
- Do not key identity by external filename or source URL alone.
- Do not hide unsupported, expired, or partial media states.
- Do not log private URLs or page data while debugging.
- Do not build polished app surfaces before proving media detection.
- Do not place build tools in runtime dependencies; keep React runtime dependencies separate from Vite/TypeScript/dev tooling.
- Do not pass bare media URL strings across layers once a structured detection record exists.
- Do not treat `blob:` URLs as downloadable media URLs; they are browser-local object references and need the underlying network request instead.
