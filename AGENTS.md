# Dew MediArchive Agent Guide

## Read Order

Before changing code, read:

1. `README.md`
2. `plan.md`
3. `learnings.md`
4. `user-learnings.md`
5. `docs/architecture.md`
6. `docs/security-and-privacy.md`
7. The files in the area you are changing

## Product Direction

Dew MediArchive is a local-first personal media archiver. The browser companion detects media candidates on pages the user visits. The desktop app will later receive jobs, download authorized media, store provenance, deduplicate files, and present a searchable local archive.

The MVP is intentionally smaller: a Chromium extension detects common non-DRM media URLs, lists them in a popup, and lets the user copy them for manual `yt-dlp` verification.

## Standing Rules

- Build from local project truth, not assumptions.
- Keep extraction, normalization, storage, and presentation separate.
- Create one source of truth per domain.
- Use explicit data models for detected media, unsupported sources, and download jobs.
- Treat every website as unstable.
- Make failure states visible and structured.
- Do not trust external URLs, filenames, MIME types, titles, or metadata.
- Do not log private media URLs, private page content, credentials, cookies, or tokens.
- Do not bypass DRM, paywalls, access controls, or platform restrictions.
- Keep unfinished future product ideas in docs or explicit placeholders, not unreachable live code.

## Branch And Commit Rules

- Do not use automation-prefixed branch names.
- Do not add tool attribution comments or co-author trailers.
- Use normal product commit messages, for example `Add media request detection`.

## Verification Expectations

For every code change, run the fastest relevant checks:

- TypeScript: `npm run typecheck` where available.
- Extension bundle: `npm run build` where available.
- Reusable logic: focused unit tests when present.
- Browser behavior: document manual load-unpacked steps and test results until automated browser checks exist.

Record meaningful verification notes in `changelog.md`.
Record owner-facing explanations and critical decision rationale in `user-learnings.md`.
