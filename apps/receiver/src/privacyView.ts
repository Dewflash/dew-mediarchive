export function renderPrivacyPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dew MediArchive Privacy</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f8fafc;
    }

    main {
      max-width: 860px;
      margin: 0 auto;
      padding: 32px 24px 48px;
    }

    nav {
      margin-bottom: 24px;
    }

    a {
      color: #2563eb;
      font-weight: 800;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    h1 {
      margin: 0 0 12px;
      font-size: 28px;
      letter-spacing: 0;
    }

    h2 {
      margin: 28px 0 10px;
      font-size: 17px;
      letter-spacing: 0;
    }

    p,
    li {
      color: #334155;
      font-size: 14px;
      line-height: 1.65;
    }

    p {
      margin: 0 0 12px;
    }

    ul {
      margin: 0;
      padding-left: 20px;
    }

    code {
      border-radius: 5px;
      background: #e2e8f0;
      color: #0f172a;
      padding: 2px 5px;
    }

    @media (prefers-color-scheme: dark) {
      :root,
      body {
        background: #111827;
        color: #f8fafc;
      }

      p,
      li {
        color: #cbd5e1;
      }

      a {
        color: #93c5fd;
      }

      code {
        background: #1f2937;
        color: #f8fafc;
      }
    }
  </style>
</head>
<body>
  <main>
    <nav><a href="/library">Back to library</a></nav>
    <h1>Privacy</h1>
    <p>Dew MediArchive is local-first. The extension observes media candidates in your browser, and the receiver saves media on this Mac when you choose Save.</p>

    <h2>What Dew Stores Locally</h2>
    <ul>
      <li>Temporary detected media and Save progress in Chrome extension session storage.</li>
      <li>Downloaded files in your Dew download folder.</li>
      <li>Job records in <code>.dew/jobs.jsonl</code>.</li>
      <li>Archive records in <code>.dew/archive.jsonl</code>.</li>
    </ul>

    <h2>What Websites Can See</h2>
    <p>Websites and media hosts can see network requests they serve. Watching a video already sends playback requests. Saving with Dew can add extra requests from <code>yt-dlp</code>, which may look like downloader activity.</p>

    <h2>What Dew Does Not Do</h2>
    <ul>
      <li>Dew does not upload your archive to a cloud service.</li>
      <li>Dew does not let websites read extension session storage or local archive files.</li>
      <li>Dew does not store browser cookies or credentials.</li>
      <li>Dew does not bypass DRM, paywalls, or access controls.</li>
    </ul>

    <h2>Private Browsing</h2>
    <p>Private or incognito windows do not hide network requests from the websites you visit. If Dew is allowed to run there, saved files and local archive records still exist outside browser history.</p>

    <h2>yt-dlp</h2>
    <p>Dew uses your local <code>yt-dlp</code> command only after you click Save. It receives the media URL, downloads the media, and writes the file locally.</p>
  </main>
</body>
</html>`;
}
