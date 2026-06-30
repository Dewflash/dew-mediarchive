import type { MediaKind, UnsupportedReason } from "../shared";

export type MediaUrlCandidateClassification = {
  status: "candidate";
  kind: MediaKind;
  label: string;
  normalizedUrl: string;
};

export type MediaUrlUnsupportedClassification = {
  status: "unsupported";
  reason: UnsupportedReason;
  message: string;
  normalizedUrl: string;
};

export type MediaUrlIgnoredClassification = {
  status: "ignored";
  reason: "invalid-url" | "non-media-url" | "media-segment";
};

export type MediaUrlClassification =
  | MediaUrlCandidateClassification
  | MediaUrlUnsupportedClassification
  | MediaUrlIgnoredClassification;

const DIRECT_MEDIA_EXTENSIONS: Record<string, { kind: MediaKind; label: string }> = {
  ".m3u8": { kind: "hls", label: "HLS stream" },
  ".mpd": { kind: "dash", label: "DASH stream" },
  ".mp4": { kind: "mp4", label: "MP4 video" },
  ".m4v": { kind: "mp4", label: "M4V video" },
  ".webm": { kind: "webm", label: "WebM video" },
  ".mp3": { kind: "audio", label: "MP3 audio" },
  ".m4a": { kind: "audio", label: "M4A audio" },
  ".aac": { kind: "audio", label: "AAC audio" },
  ".ogg": { kind: "audio", label: "Ogg audio" },
  ".wav": { kind: "audio", label: "WAV audio" }
};

const MEDIA_SEGMENT_EXTENSIONS = new Set([".ts", ".m4s", ".cmfv", ".cmfa"]);

const BLOCKED_PLATFORM_HOSTS = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "googlevideo.com"
];

const DRM_LIKELY_HOSTS = [
  "netflix.com",
  "disneyplus.com",
  "primevideo.com",
  "hulu.com",
  "max.com",
  "hbomax.com",
  "peacocktv.com",
  "paramountplus.com",
  "tv.apple.com"
];

export function classifyMediaUrl(rawUrl: string): MediaUrlClassification {
  const parsedUrl = parseUrl(rawUrl);

  if (!parsedUrl) {
    return { status: "ignored", reason: "invalid-url" };
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return {
      status: "unsupported",
      reason: "unsupported-scheme",
      message: "Only http and https media URLs are supported.",
      normalizedUrl: parsedUrl.href
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (matchesHost(hostname, BLOCKED_PLATFORM_HOSTS)) {
    return {
      status: "unsupported",
      reason: "blocked-platform",
      message: "This platform is intentionally unsupported.",
      normalizedUrl: parsedUrl.href
    };
  }

  if (matchesHost(hostname, DRM_LIKELY_HOSTS)) {
    return {
      status: "unsupported",
      reason: "drm-likely",
      message: "This source is likely protected and is unsupported.",
      normalizedUrl: parsedUrl.href
    };
  }

  const extension = getPathExtension(parsedUrl.pathname);
  const directMedia = DIRECT_MEDIA_EXTENSIONS[extension];

  if (directMedia) {
    return {
      status: "candidate",
      kind: directMedia.kind,
      label: directMedia.label,
      normalizedUrl: parsedUrl.href
    };
  }

  if (MEDIA_SEGMENT_EXTENSIONS.has(extension)) {
    return { status: "ignored", reason: "media-segment" };
  }

  return { status: "ignored", reason: "non-media-url" };
}

function parseUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function matchesHost(hostname: string, domains: string[]): boolean {
  return domains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

function getPathExtension(pathname: string): string {
  const lastSegment = pathname.split("/").pop() ?? "";
  const dotIndex = lastSegment.lastIndexOf(".");

  if (dotIndex < 0) {
    return "";
  }

  return lastSegment.slice(dotIndex).toLowerCase();
}

