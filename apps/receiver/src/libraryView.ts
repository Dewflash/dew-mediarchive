import type { ArchiveRecord } from "./types.js";

export function renderLibraryPage(records: ArchiveRecord[]): string {
  const rows = records.map(renderArchiveRow).join("");
  const body =
    records.length > 0
      ? `<table class="library-table"><thead><tr><th>Media</th><th>Saved</th><th>Size</th><th>Hash</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<section class="empty"><h2>No saved media yet</h2></section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dew MediArchive Library</title>
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
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      font-size: 24px;
      letter-spacing: 0;
    }

    .count {
      color: #475569;
      font-size: 13px;
      font-weight: 700;
    }

    .library-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #dbe4ef;
      background: #ffffff;
    }

    th,
    td {
      border-bottom: 1px solid #e2e8f0;
      padding: 12px;
      text-align: left;
      vertical-align: top;
    }

    th {
      color: #475569;
      font-size: 12px;
      font-weight: 800;
    }

    td {
      font-size: 13px;
    }

    .title {
      color: #0f172a;
      font-weight: 800;
      line-height: 1.35;
    }

    .meta,
    .path,
    .hash {
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .kind {
      display: inline-block;
      margin-top: 6px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 7px;
    }

    .empty {
      border: 1px solid #dbe4ef;
      background: #ffffff;
      padding: 32px;
    }

    .empty h2 {
      color: #475569;
      font-size: 16px;
      letter-spacing: 0;
    }

    @media (prefers-color-scheme: dark) {
      :root,
      body {
        background: #111827;
        color: #f8fafc;
      }

      .count,
      th,
      .meta,
      .path,
      .hash,
      .empty h2 {
        color: #cbd5e1;
      }

      .library-table,
      .empty {
        border-color: #334155;
        background: #1f2937;
      }

      th,
      td {
        border-bottom-color: #334155;
      }

      .title {
        color: #f8fafc;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Dew MediArchive</h1>
      <p class="count">${records.length} saved item${records.length === 1 ? "" : "s"}</p>
    </header>
    ${body}
  </main>
</body>
</html>`;
}

function renderArchiveRow(record: ArchiveRecord): string {
  const title = record.pageTitle?.trim() || getFilename(record.outputPath);

  return `<tr>
  <td>
    <p class="title">${escapeHtml(title)}</p>
    <p class="meta">${escapeHtml(record.sourceUrl)}</p>
    ${record.kind ? `<span class="kind">${escapeHtml(record.kind)}</span>` : ""}
  </td>
  <td>
    <p>${escapeHtml(formatTimestamp(record.createdAt))}</p>
    <p class="path">${escapeHtml(record.outputPath)}</p>
  </td>
  <td>${escapeHtml(formatBytes(record.byteSize))}</td>
  <td><span class="hash" title="${escapeHtml(record.sha256)}">${escapeHtml(record.sha256.slice(0, 12))}</span></td>
</tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFilename(filePath: string): string {
  const parts = filePath.replaceAll("\\", "/").split("/");
  return parts.at(-1) || filePath;
}

function formatBytes(byteSize: number): string {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }

  if (byteSize < 1024 * 1024) {
    return `${(byteSize / 1024).toFixed(1)} KB`;
  }

  return `${(byteSize / 1024 / 1024).toFixed(1)} MB`;
}

function formatTimestamp(timestamp: string): string {
  return timestamp.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}
