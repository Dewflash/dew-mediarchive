# Architecture

## Target Pipeline

```text
detect -> classify -> normalize -> queue -> download -> hash -> store -> index -> present
```

The MVP implements only the first user-visible slice:

```text
detect -> classify -> normalize -> present/copy/save
```

The receiver implements the first local save backend slice:

```text
queue -> download
```

## Boundaries

- Detection observes browser requests and page context.
- Classification decides whether a URL is a candidate, unsupported, or ignored.
- Normalization converts raw browser data into stable project types.
- Presentation shows detected candidates and failure states.
- Downloading is owned by the local receiver.
- Hashing, content-addressed storage, indexing, and archive presentation belong to later phases.

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

The background service worker listens to HTTP/HTTPS request URLs, classifies them, and stores structured media snapshots per tab in Chrome session storage.

```text
webRequest.onBeforeRequest
  -> classifyMediaUrl(url)
  -> create DetectedMedia
  -> append to tab snapshot
  -> update extension badge
```

The popup should read the same snapshot instead of duplicating detection logic.

## Page Media Fallback

The extension also injects a content script on pages. It scans `video`, `audio`, and nested `source` elements, normalizes resolved media URLs, and sends page media messages to the background worker.

```text
content script scans media elements
  -> chrome.runtime.sendMessage(page media URL)
  -> background validates message shape
  -> classifyMediaUrl(url)
  -> create DetectedMedia with page-video-element provenance
  -> append to tab snapshot
  -> update extension badge
```

This fallback exists because Manifest V3 service workers are short-lived. Runtime testing showed that the local page could request `sample.mp4` while the network-only path failed to leave a stored candidate. The content script produced the first clean real-browser `sample.mp4` candidate.

## Popup Flow

The popup reads the current tab's media snapshot from the shared storage helper.

```text
popup opens
  -> find active tab
  -> read session snapshot
  -> render loading, empty, error, candidates, or unsupported states
  -> copy candidate URL on request
  -> save candidate URL to local receiver on request
```

The shared storage helper owns the snapshot key so the background worker and popup cannot drift.

For automation and debugging, the popup also accepts an explicit `tabId` query parameter:

```text
popup.html?tabId=<known-tab-id>
  -> read that tab's session snapshot
  -> render the same popup UI
```

Normal toolbar popup behavior is unchanged because toolbar opens do not include this query string.

## Local Receiver Flow

The receiver in `apps/receiver` is a local-only HTTP service. It listens on `127.0.0.1` and exposes a small job API:

```text
GET  /health
GET  /archive
GET  /library
GET  /downloads
GET  /downloads/:id
POST /downloads
```

The extension Save flow is:

```text
popup Save
  -> POST http://127.0.0.1:47321/downloads
  -> receiver validates JSON and URL shape
  -> job is appended to jobs.jsonl
  -> yt-dlp runs with argument-array spawning
  -> completed output is hashed and appended to archive.jsonl
  -> job becomes completed or failed
  -> popup shows queued, downloading, saved, or retryable failure
```

The receiver deliberately does not depend on the extension internals. It accepts a normalized download request:

```text
url, optional pageUrl, optional pageTitle, optional kind
```

That keeps the browser detection surface and the local save surface separated.

## Receiver Storage

The first receiver store is append-only JSONL:

```text
~/Movies/Dew MediArchive/.dew/jobs.jsonl
```

Each job state transition writes a new complete job record. On startup, the receiver replays the file and keeps the latest record for each job id in memory.

Completed saves also create archive records:

```text
~/Movies/Dew MediArchive/.dew/archive.jsonl
```

Each archive record stores source URL, page context, output path, byte size, SHA-256 hash, and capture timestamps. This is not the final object-store layout, but it gives the future library view a durable index.

## Local Library View

The receiver serves a simple local library page:

```text
GET /library
```

It renders `archive.jsonl` records as HTML and redirects `/` to `/library`. The page is server-rendered, has no client-side scripts, escapes archive metadata, and uses a restrictive content security policy.

## Future App Shape

The final product should use a job-based local pipeline:

- discovery jobs
- metadata extraction jobs
- download jobs
- thumbnail/transcode jobs
- hash/dedupe jobs
- index jobs

Jobs should be retryable, idempotent, and explicit about failure reasons.
