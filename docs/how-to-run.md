# How To Know What To Run

Different projects run differently. The first question is:

```text
Who serves the UI?
```

## Dew

Dew has two main running pieces:

```text
Chrome extension UI + local receiver backend
```

### Normal Use

Run this from the repo root:

```bash
cd /Users/kevinyongcj/Programming/dew-mediarchive
npm run dew
```

Or double-click:

```text
Dew.command
```

That starts the local receiver/backend at:

```text
http://127.0.0.1:47321
```

The receiver is what downloads media, writes job records, saves files, and serves the library.

### Chrome Extension UI

The extension UI is not served by `npm run dev` during normal use.

Chrome loads the built extension files directly from:

```text
apps/extension/dist
```

So for normal use:

```text
Load extension in Chrome once -> run Dew.command/npm run dew -> use toolbar button
```

## Why We Ran Commands In Different Folders

### Repo Root

Use this to run Dew:

```bash
npm run dew
```

This is the normal app/backend launcher.

### Extension Folder

Use this only when developing or checking extension code:

```bash
cd apps/extension
npm run build
npm run test
npm run typecheck
```

This updates and verifies the Chrome extension files.

### Receiver Folder

Use this only when developing or checking backend code:

```bash
cd apps/receiver
npm run build
npm run test
npm run typecheck
```

This updates and verifies the local backend receiver.

## General Rule For Other Projects

If the app is a normal website:

```text
npm run dev usually runs the frontend.
```

If the app has a separate backend:

```text
Run backend in one terminal.
Run frontend in another terminal.
```

If the app is a Chrome extension:

```text
Chrome loads the extension files.
Only run a backend if the extension needs one.
```

If the app is a desktop/mobile app:

```text
The app shell runs the UI.
A backend may or may not be separate.
```

For Dew, the short version is:

```text
Chrome runs the extension UI.
Dew.command / npm run dew runs the backend.
```
