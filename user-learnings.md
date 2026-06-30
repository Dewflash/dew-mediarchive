# User Learnings

This file explains important Dew MediArchive decisions in plain language. It is meant to help the owner understand why the project is built this way, not just what changed.

## Why Start With Chromium Instead Of Safari

Chromium browsers such as Chrome, Brave, and Edge let us load an unpacked extension directly from a local folder. That makes the first MVP fast to build and test.

Safari extensions are harder because they need an Apple app and Xcode extension wrapper. Safari can come later, but starting there would slow down the core proof: can Dew detect useful media URLs?

## Why The MVP Detects And Copies Before It Downloads

The biggest product risk is media detection. If Dew cannot see useful media candidates on real pages, a polished app will not matter.

The first MVP therefore proves this smaller flow:

```text
browser sees media -> Dew detects URL -> popup shows candidate -> user copies URL -> yt-dlp verifies download
```

Once that works, the next phase can replace Copy with Save:

```text
popup Save button -> local receiver -> yt-dlp downloads automatically
```

## Why Documentation Comes Before More Code

Dew can easily become messy because it touches browsers, media URLs, local files, future download jobs, and privacy-sensitive page context. The docs give future work rails:

- what the product is
- what is intentionally unsupported
- how the pipeline should be separated
- how to verify progress
- what decisions should not be relitigated without evidence

## Why We Treat YouTube And DRM Platforms As Unsupported

Dew is meant to become a legitimate local media archiving product. Supporting YouTube downloads or DRM bypassing would create product, legal, and platform-distribution risk.

The safer product rule is:

```text
Dew archives authorized non-DRM media.
Protected or restricted platforms are explicit unsupported states.
```

## Why The Project Uses A Pipeline Shape

The final product should not have one giant function that tries to "download a URL." That becomes impossible to reason about.

Instead, the product should grow as a pipeline:

```text
detect -> classify -> normalize -> queue -> download -> hash -> store -> index -> present
```

The MVP implements only:

```text
detect -> classify -> normalize -> present/copy
```

This keeps early work small while still pointing toward the full product.

