# Archive Format

## Target Principles

- Store original media files in portable folders.
- Store metadata in a documented local database.
- Hash media bytes for dedupe and stable identity.
- Keep source URL and capture timestamp as provenance, not identity.
- Make export non-negotiable.

## Future Layout

```text
archive/
  objects/
    sha256/
      ab/
        abc123...
  captures/
    2026/
      07/
        capture-id.json
  thumbnails/
  exports/
```

## MVP

The MVP writes append-only archive metadata as JSONL:

```text
~/Movies/Dew MediArchive/.dew/archive.jsonl
```

Each completed receiver download appends one record:

```json
{
  "id": "archive-record-id",
  "jobId": "download-job-id",
  "sourceUrl": "https://example.test/video.mp4",
  "pageUrl": "https://example.test/watch",
  "pageTitle": "Example",
  "mediaTitle": "Launch Trailer",
  "kind": "mp4",
  "outputPath": "/Users/example/Movies/Dew MediArchive/video.mp4",
  "byteSize": 12345,
  "sha256": "hex-encoded-sha256",
  "capturedAt": "2026-07-01T10:00:00.000Z",
  "createdAt": "2026-07-01T10:00:00.100Z"
}
```

`mediaTitle` is the best-effort title for the specific media element, while `pageTitle` is the browser page title. Keeping both fields avoids five videos from one page collapsing into the same label.

The downloaded media file still stays in the user-facing download folder. The JSONL record is the first portable index for future search, dedupe, export, and gallery views.

The personal-tool MVP exposes portable metadata exports while the receiver is running:

```text
GET /export/archive.json
GET /export/archive.csv
```

Exports are generated from archive records, not job history. Query parameters shared with `/library` can filter exports by search, kind, and sort order.
