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

The MVP uses generic URL pattern detection. Specific adapters come later only after real site behavior proves they are needed.

