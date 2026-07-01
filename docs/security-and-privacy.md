# Security And Privacy

## Hard Boundaries

- Do not bypass DRM.
- Do not bypass paywalls, login walls, access controls, or platform restrictions.
- Do not support YouTube or premium streaming platforms in the product path.
- Do not store credentials, cookies, auth headers, private page content, or private media URLs in logs.
- Do not execute scripts or render untrusted HTML from captured pages.

## URL Safety

- Treat all external URLs as untrusted.
- Sanitize display strings.
- Never use external filenames directly for filesystem paths.
- Receiver download jobs accept only `http` and `https` URLs.
- Prevent path traversal in save paths.

## Local Receiver

- Bind to `127.0.0.1` by default.
- Allow browser-extension origins and localhost tooling, not normal website origins.
- Keep the request body small and require JSON.
- Run `yt-dlp` with an argument array, not a shell command string.
- Store receiver job records locally, not in a cloud service.
- Keep raw tokenized URLs out of logs.

## Logging

Logs should use structured status and failure reasons. Avoid raw URLs when they may contain tokens.

## Archive Metadata

Archive records intentionally store source URLs and page context because provenance is part of the product. Treat `archive.jsonl` as local private user data. Do not upload it, print it in public logs, or include it in bug reports without redaction.

The local library renders archive metadata as untrusted content. Escape page titles, URLs, paths, and hashes before writing HTML. Keep the library script-free unless there is a specific need and matching review.

`mediaTitle` is also untrusted page-visible context. It may come from element labels, captions, or nearby headings, and should stay local/private like source URLs and page titles. Sanitize it before storage, escape it before display, and never treat it as proof of identity.

Archive exports are local private data. JSON and CSV exports should not be uploaded or shared without redaction. CSV exports must escape spreadsheet formula prefixes in text fields so untrusted page metadata cannot execute when opened in a spreadsheet.

## User Promise

Dew is for archiving media the user is allowed to save. Unsupported or protected sources should be visible states, not hidden failures.
