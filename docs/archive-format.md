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

The MVP does not write an archive. It defines detected media records that later become archive provenance.

