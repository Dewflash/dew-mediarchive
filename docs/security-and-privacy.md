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
- Block dangerous schemes for future download jobs.
- Prevent path traversal in any future save path.

## Logging

Logs should use structured status and failure reasons. Avoid raw URLs when they may contain tokens.

## User Promise

Dew is for archiving media the user is allowed to save. Unsupported or protected sources should be visible states, not hidden failures.

