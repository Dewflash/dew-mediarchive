# Learnings

## Durable Decisions

- Start with Chromium, not Safari. Chromium supports fast unpacked extension testing; Safari requires an Apple app and Xcode extension wrapper.
- Start with detect-and-copy, then add automatic save. Detection quality is the core product risk.
- Shape the MVP around final data models so the detector can feed the later desktop app.
- Treat YouTube and premium streaming platforms as unsupported in the product path.
- The sellable product is the desktop media archive app; the extension is a companion capture surface.

## Mistakes To Avoid

- Do not turn detection, downloading, metadata, and UI into one function.
- Do not key identity by external filename or source URL alone.
- Do not hide unsupported, expired, or partial media states.
- Do not log private URLs or page data while debugging.
- Do not build polished app surfaces before proving media detection.

