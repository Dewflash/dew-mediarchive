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

## Future App Shape

The final product should use a job-based local pipeline:

- discovery jobs
- metadata extraction jobs
- download jobs
- thumbnail/transcode jobs
- hash/dedupe jobs
- index jobs

Jobs should be retryable, idempotent, and explicit about failure reasons.

