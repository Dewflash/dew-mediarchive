# Source Adapters

## Purpose

Every source is unstable. Source-specific behavior should live behind adapter contracts instead of spreading special cases across the extension and desktop app.

## Future Contract

```ts
type SourceAdapter = {
  id: string;
  canHandle(context: DetectionContext): boolean;
  discover(context: DetectionContext): Promise<DetectedMedia[]>;
  normalize(raw: unknown): DetectedMedia[];
};
```

## Rules

- Adapters must not bypass DRM, paywalls, or access controls.
- Adapters must report unsupported sources explicitly.
- Adapters must not store credentials, cookies, or private page content.
- Adapters should version meaningful parser changes.
- Shared URL classification belongs in shared helpers, not in UI components.

## MVP

The MVP uses generic URL pattern detection in `apps/extension/src/detector/mediaUrlClassifier.ts`. Specific adapters come later only after real site behavior proves they are needed.

The generic classifier:

- accepts common media playlist/file extensions such as `.m3u8`, `.mpd`, `.mp4`, and `.webm`
- ignores common media segments such as `.ts`, `.m4s`, and numbered fragment/chunk URLs
- labels master HLS/DASH playlists as auto-best-quality saves
- dedupes quality-specific playlist variants under the same stream group, preferring a master playlist when one is seen and otherwise keeping the highest-quality variant seen
- marks unsupported schemes such as `blob:` as unsupported
- marks blocked or DRM-heavy platforms as unsupported before extension matching
