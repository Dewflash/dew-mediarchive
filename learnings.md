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
- Chrome runtime fields and installed TypeScript package fields may not always line up. When needed, model optional runtime fields narrowly instead of weakening all Chrome types.
- Store detected media in `chrome.storage.session` for the MVP so the popup and background service worker share state without committing media URLs to durable browser storage.
- Web requests can arrive concurrently. Snapshot writes must be serialized per tab or one read/modify/write cycle can overwrite another.
- Put the media snapshot storage key and read/write helpers in shared code so popup and background code cannot silently drift.
- Typed test fixtures should satisfy the same Chrome API types as production code. If the test cheats the shape, it can hide integration assumptions.
- Popup tests should cover both success and failure states because clipboard access can fail even when the UI renders correctly.
- MV3 network observation alone is not enough for the MVP. A real Chrome run loaded the page and requested `sample.mp4`, but no snapshot was stored until the extension also had a content-script media-element fallback.
- The background network listener should watch only `http` and `https` URLs. Browser and extension-internal assets are not user media candidates and should not appear as unsupported archive items.
- A standalone `chrome-extension://.../popup.html` tab is useful for inspecting extension storage, but it is not proof of the real toolbar popup because Chrome treats that standalone page as the active tab.

## Mistakes To Avoid

- Do not turn detection, downloading, metadata, and UI into one function.
- Do not key identity by external filename or source URL alone.
- Do not hide unsupported, expired, or partial media states.
- Do not log private URLs or page data while debugging.
- Do not build polished app surfaces before proving media detection.
- Do not place build tools in runtime dependencies; keep React runtime dependencies separate from Vite/TypeScript/dev tooling.
- Do not pass bare media URL strings across layers once a structured detection record exists.
- Do not treat `blob:` URLs as downloadable media URLs; they are browser-local object references and need the underlying network request instead.
- Do not make the popup re-scan the page. The background worker owns detection; the popup should read snapshots.
- Do not perform unqueued read/modify/write updates for per-tab detection snapshots.
- Do not let clipboard failures fail silently; copy errors should be visible in the popup.
- Do not treat runtime-passing tests as enough when TypeScript says the mock shape does not match the browser API.
- Do not count component tests as a substitute for the final real toolbar-popup smoke test.
- Do not remove the page media-element fallback just because `webRequest` exists; the fallback is what produced the first clean runtime `sample.mp4` candidate.
- Do not let the extension observe its own popup assets as media detections.
