# Architecture

## Target Pipeline

```text
detect -> classify -> normalize -> queue -> download -> hash -> store -> index -> present
```

The MVP implements only the first user-visible slice:

```text
detect -> classify -> normalize -> present/copy
```

## Boundaries

- Detection observes browser requests and page context.
- Classification decides whether a URL is a candidate, unsupported, or ignored.
- Normalization converts raw browser data into stable project types.
- Presentation shows detected candidates and failure states.
- Downloading, hashing, storage, indexing, and archive presentation belong to later phases.

## Shared Detection Model

The extension starts with a shared detection model in `apps/extension/src/shared/media.ts`. The model is intentionally created before request detection so background scripts, popup UI, future local receivers, and the desktop app can reuse the same concepts:

- `DetectedMedia`
- `MediaCandidate`
- `UnsupportedMedia`
- `MediaKind`
- `UnsupportedReason`
- `MediaDetectionSnapshot`

This keeps the MVP from passing raw strings between layers.

## Background Detection Flow

The background service worker listens to request URLs, classifies them, and stores structured media snapshots per tab in Chrome session storage.

```text
webRequest.onBeforeRequest
  -> classifyMediaUrl(url)
  -> create DetectedMedia
  -> append to tab snapshot
  -> update extension badge
```

The popup should read the same snapshot instead of duplicating detection logic.

## Popup Flow

The popup reads the current tab's media snapshot from the shared storage helper.

```text
popup opens
  -> find active tab
  -> read session snapshot
  -> render loading, empty, error, candidates, or unsupported states
  -> copy candidate URL on request
```

The shared storage helper owns the snapshot key so the background worker and popup cannot drift.

## Future App Shape

The final product should use a job-based local pipeline:

- discovery jobs
- metadata extraction jobs
- download jobs
- thumbnail/transcode jobs
- hash/dedupe jobs
- index jobs

Jobs should be retryable, idempotent, and explicit about failure reasons.
