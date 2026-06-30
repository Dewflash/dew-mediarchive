import type { DownloadKind, DownloadRequest } from "./types.js";

const DOWNLOAD_KINDS = new Set<DownloadKind>([
  "mp4",
  "webm",
  "audio",
  "hls",
  "dash",
  "unknown"
]);

export type ValidationResult =
  | { ok: true; value: DownloadRequest }
  | { ok: false; message: string };

export function validateDownloadRequest(value: unknown): ValidationResult {
  if (!value || typeof value !== "object") {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const candidate = value as Partial<Record<keyof DownloadRequest, unknown>>;

  if (typeof candidate.url !== "string" || candidate.url.trim() === "") {
    return { ok: false, message: "url is required." };
  }

  const normalizedUrl = normalizeHttpUrl(candidate.url);

  if (!normalizedUrl) {
    return { ok: false, message: "url must be an http or https URL." };
  }

  const request: DownloadRequest = {
    url: normalizedUrl
  };

  if (candidate.pageUrl !== undefined) {
    if (typeof candidate.pageUrl !== "string") {
      return { ok: false, message: "pageUrl must be a string." };
    }

    const normalizedPageUrl = normalizeHttpUrl(candidate.pageUrl);

    if (!normalizedPageUrl) {
      return { ok: false, message: "pageUrl must be an http or https URL." };
    }

    request.pageUrl = normalizedPageUrl;
  }

  if (candidate.pageTitle !== undefined) {
    if (typeof candidate.pageTitle !== "string") {
      return { ok: false, message: "pageTitle must be a string." };
    }

    request.pageTitle = candidate.pageTitle.slice(0, 500);
  }

  if (candidate.kind !== undefined) {
    if (typeof candidate.kind !== "string" || !DOWNLOAD_KINDS.has(candidate.kind as DownloadKind)) {
      return { ok: false, message: "kind is not supported." };
    }

    request.kind = candidate.kind as DownloadKind;
  }

  return { ok: true, value: request };
}

function normalizeHttpUrl(rawUrl: string): string | undefined {
  try {
    const parsedUrl = new URL(rawUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return undefined;
    }

    return parsedUrl.href;
  } catch {
    return undefined;
  }
}
