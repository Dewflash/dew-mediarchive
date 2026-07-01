import type { ArchiveRecord, DownloadKind } from "./types.js";

export type LibrarySort = "newest" | "oldest" | "source" | "size";

export type LibraryViewOptions = {
  search?: string;
  kind?: DownloadKind | "all";
  sort?: LibrarySort;
};

export function renderLibraryPage(
  records: ArchiveRecord[],
  options: LibraryViewOptions = {}
): string {
  const normalizedOptions = normalizeOptions(options);
  const visibleRecords = filterAndSortArchiveRecords(records, normalizedOptions);
  const rows = visibleRecords.map(renderArchiveRow).join("");
  const exportQuery = createQueryString(normalizedOptions);
  const body =
    visibleRecords.length > 0
      ? `<table class="library-table"><thead><tr><th>Media</th><th>Saved</th><th>Size</th><th>Hash</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<section class="empty"><h2>No saved media found</h2><p>Try clearing filters or saving a new authorized media item.</p></section>`;

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
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
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

    a {
      color: #2563eb;
      font-weight: 750;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .count {
      color: #475569;
      font-size: 13px;
      font-weight: 700;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) 150px 150px auto;
      gap: 10px;
      align-items: end;
      margin-bottom: 18px;
    }

    .field {
      display: grid;
      gap: 5px;
    }

    label {
      color: #475569;
      font-size: 11px;
      font-weight: 800;
    }

    input,
    select,
    button,
    .export-link {
      min-height: 36px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      font: inherit;
      font-size: 13px;
      padding: 7px 9px;
    }

    button,
    .export-link {
      cursor: pointer;
      font-weight: 800;
    }

    button {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
    }

    .exports {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .export-link {
      display: inline-flex;
      align-items: center;
      color: #1e293b;
    }

    .summary {
      margin-bottom: 12px;
      color: #64748b;
      font-size: 13px;
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

    .path {
      margin-top: 5px;
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

    .empty p {
      margin-top: 8px;
      color: #64748b;
      font-size: 13px;
    }

    @media (max-width: 760px) {
      header,
      .toolbar {
        grid-template-columns: 1fr;
      }

      header {
        display: grid;
      }

      .exports {
        justify-content: flex-start;
      }
    }

    @media (prefers-color-scheme: dark) {
      :root,
      body {
        background: #111827;
        color: #f8fafc;
      }

      a {
        color: #93c5fd;
      }

      .count,
      label,
      th,
      .summary,
      .meta,
      .path,
      .hash,
      .empty h2,
      .empty p {
        color: #cbd5e1;
      }

      input,
      select,
      .export-link {
        border-color: #475569;
        background: #111827;
        color: #f8fafc;
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
      <div class="header-actions">
        <a href="/privacy">Privacy</a>
        <p class="count">${records.length} saved item${records.length === 1 ? "" : "s"}</p>
      </div>
    </header>
    <form class="toolbar" method="get" action="/library">
      <div class="field">
        <label for="search">Search</label>
        <input id="search" name="q" value="${escapeHtml(normalizedOptions.search ?? "")}" placeholder="Title, source, or file path">
      </div>
      <div class="field">
        <label for="kind">Type</label>
        <select id="kind" name="kind">${renderKindOptions(normalizedOptions.kind)}</select>
      </div>
      <div class="field">
        <label for="sort">Sort</label>
        <select id="sort" name="sort">${renderSortOptions(normalizedOptions.sort)}</select>
      </div>
      <button type="submit">Apply</button>
    </form>
    <div class="exports">
      <a class="export-link" href="${escapeHtml(`/export/archive.json${exportQuery}`)}">Export JSON</a>
      <a class="export-link" href="${escapeHtml(`/export/archive.csv${exportQuery}`)}">Export CSV</a>
    </div>
    <p class="summary">${visibleRecords.length} shown${visibleRecords.length === records.length ? "" : ` from ${records.length}`}</p>
    ${body}
  </main>
</body>
</html>`;
}

export function filterAndSortArchiveRecords(
  records: ArchiveRecord[],
  options: LibraryViewOptions = {}
): ArchiveRecord[] {
  const normalizedOptions = normalizeOptions(options);
  const search = normalizedOptions.search?.toLocaleLowerCase();

  const filteredRecords = records.filter((record) => {
    if (normalizedOptions.kind !== "all" && record.kind !== normalizedOptions.kind) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      record.pageTitle,
      record.mediaTitle,
      record.sourceUrl,
      record.pageUrl,
      record.outputPath,
      record.kind,
      record.sha256
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(search));
  });

  return filteredRecords.sort((left, right) => {
    if (normalizedOptions.sort === "oldest") {
      return left.createdAt.localeCompare(right.createdAt);
    }

    if (normalizedOptions.sort === "source") {
      return left.sourceUrl.localeCompare(right.sourceUrl);
    }

    if (normalizedOptions.sort === "size") {
      return right.byteSize - left.byteSize;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function getLibraryOptionsFromSearchParams(
  searchParams: URLSearchParams
): LibraryViewOptions {
  const kind = searchParams.get("kind");
  const sort = searchParams.get("sort");

  return normalizeOptions({
    kind: isDownloadKind(kind) ? kind : "all",
    search: searchParams.get("q") ?? undefined,
    sort: isLibrarySort(sort) ? sort : "newest"
  });
}

function renderArchiveRow(record: ArchiveRecord): string {
  const title =
    record.mediaTitle?.trim() ||
    record.pageTitle?.trim() ||
    getFilename(record.outputPath);
  const pageContext = record.mediaTitle && record.pageTitle ? record.pageTitle : undefined;

  return `<tr>
  <td>
    <p class="title">${escapeHtml(title)}</p>
    ${pageContext ? `<p class="meta">${escapeHtml(pageContext)}</p>` : ""}
    <p class="meta">${escapeHtml(record.sourceUrl)}</p>
    ${record.kind ? `<span class="kind">${escapeHtml(record.kind)}</span>` : ""}
  </td>
  <td>
    <p>${escapeHtml(formatTimestamp(record.createdAt))}</p>
    <p class="path">${escapeHtml(record.outputPath)}</p>
  </td>
  <td>${escapeHtml(formatBytes(record.byteSize))}</td>
  <td><span class="hash" title="${escapeHtml(record.sha256)}">${escapeHtml(record.sha256.slice(0, 12))}</span></td>
  <td><a href="${escapeHtml(record.sourceUrl)}" rel="noreferrer">Open source</a></td>
</tr>`;
}

function renderKindOptions(selectedKind: LibraryViewOptions["kind"]): string {
  const kinds: Array<{ label: string; value: DownloadKind | "all" }> = [
    { label: "All", value: "all" },
    { label: "MP4", value: "mp4" },
    { label: "WebM", value: "webm" },
    { label: "Audio", value: "audio" },
    { label: "HLS", value: "hls" },
    { label: "DASH", value: "dash" },
    { label: "Unknown", value: "unknown" }
  ];

  return kinds
    .map(
      (kind) =>
        `<option value="${kind.value}"${selectedKind === kind.value ? " selected" : ""}>${kind.label}</option>`
    )
    .join("");
}

function renderSortOptions(selectedSort: LibrarySort | undefined): string {
  const sorts: Array<{ label: string; value: LibrarySort }> = [
    { label: "Newest", value: "newest" },
    { label: "Oldest", value: "oldest" },
    { label: "Source", value: "source" },
    { label: "Largest", value: "size" }
  ];

  return sorts
    .map(
      (sort) =>
        `<option value="${sort.value}"${selectedSort === sort.value ? " selected" : ""}>${sort.label}</option>`
    )
    .join("");
}

function normalizeOptions(options: LibraryViewOptions): Required<LibraryViewOptions> {
  return {
    kind: isDownloadKind(options.kind) ? options.kind : "all",
    search: options.search?.trim() || "",
    sort: isLibrarySort(options.sort) ? options.sort : "newest"
  };
}

function createQueryString(options: Required<LibraryViewOptions>): string {
  const params = new URLSearchParams();

  if (options.search) {
    params.set("q", options.search);
  }

  if (options.kind !== "all") {
    params.set("kind", options.kind);
  }

  if (options.sort !== "newest") {
    params.set("sort", options.sort);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function isDownloadKind(value: unknown): value is DownloadKind | "all" {
  return (
    value === "all" ||
    value === "mp4" ||
    value === "webm" ||
    value === "audio" ||
    value === "hls" ||
    value === "dash" ||
    value === "unknown"
  );
}

function isLibrarySort(value: unknown): value is LibrarySort {
  return value === "newest" || value === "oldest" || value === "source" || value === "size";
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
