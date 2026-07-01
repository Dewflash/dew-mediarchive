import type { MediaKind, UnsupportedReason } from "../shared";

export type MediaUrlCandidateClassification = {
  status: "candidate";
  kind: MediaKind;
  label: string;
  normalizedUrl: string;
  quality?: string;
  streamGroupKey?: string;
  streamRole?: "master-playlist" | "variant-playlist";
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

const MEDIA_SEGMENT_EXTENSIONS = new Set([
  ".ts",
  ".m2ts",
  ".m4s",
  ".cmfv",
  ".cmfa",
  ".mp4v",
  ".m4vfrag"
]);

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
  if (MEDIA_SEGMENT_EXTENSIONS.has(extension) || looksLikeMediaSegment(parsedUrl)) {
    return { status: "ignored", reason: "media-segment" };
  }

  const directMedia = DIRECT_MEDIA_EXTENSIONS[extension];

  if (directMedia) {
    const streamMetadata =
      directMedia.kind === "hls" || directMedia.kind === "dash"
        ? getStreamPlaylistMetadata(parsedUrl)
        : undefined;

    return {
      status: "candidate",
      kind: directMedia.kind,
      label: getMediaLabel(directMedia.label, streamMetadata),
      quality: streamMetadata?.quality,
      normalizedUrl: parsedUrl.href,
      streamGroupKey: streamMetadata?.streamGroupKey,
      streamRole: streamMetadata?.streamRole
    };
  }

  return { status: "ignored", reason: "non-media-url" };
}

function getStreamPlaylistMetadata(
  parsedUrl: URL
): Pick<
  MediaUrlCandidateClassification,
  "quality" | "streamGroupKey" | "streamRole"
> {
  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
  const filename = pathSegments.at(-1) ?? "";
  const normalizedFilename = filename.toLowerCase();
  const quality = extractPlaylistQuality(parsedUrl);
  const streamRole = isMasterPlaylistFilename(normalizedFilename, quality)
    ? "master-playlist"
    : "variant-playlist";
  const groupSegments =
    streamRole === "master-playlist"
      ? pathSegments.slice(0, -1)
      : trimVariantPathSegments(pathSegments);
  const groupPath = groupSegments.join("/");

  return {
    quality,
    streamGroupKey: groupPath
      ? `${parsedUrl.protocol}//${parsedUrl.host}/${groupPath}`
      : parsedUrl.href,
    streamRole
  };
}

function getMediaLabel(
  baseLabel: string,
  streamMetadata:
    | Pick<
        MediaUrlCandidateClassification,
        "quality" | "streamRole"
      >
    | undefined
): string {
  if (!streamMetadata) {
    return baseLabel;
  }

  if (streamMetadata.streamRole === "master-playlist") {
    return `${baseLabel} · Auto best quality`;
  }

  return streamMetadata.quality
    ? `${baseLabel} variant · ${streamMetadata.quality}`
    : `${baseLabel} variant`;
}

function isMasterPlaylistFilename(
  filename: string,
  quality: string | undefined
): boolean {
  return (
    filename.includes("master") ||
    filename.includes("manifest") ||
    (filename.includes("playlist") && !quality)
  );
}

function trimVariantPathSegments(pathSegments: string[]): string[] {
  const withoutFilename = pathSegments.slice(0, -1);
  const lastDirectory = withoutFilename.at(-1)?.toLowerCase() ?? "";

  if (isQualitySegment(lastDirectory) || isVariantSegment(lastDirectory)) {
    return withoutFilename.slice(0, -1);
  }

  return withoutFilename;
}

function extractPlaylistQuality(parsedUrl: URL): string | undefined {
  const pathAndQuery = `${parsedUrl.pathname} ${parsedUrl.search}`.toLowerCase();
  const heightMatch = /(?:^|[^\d])([1-9]\d{2,3})p(?:[^\d]|$)/.exec(pathAndQuery);

  if (heightMatch) {
    return `${heightMatch[1]}p`;
  }

  const resolutionMatch = /(?:^|[^\d])\d{3,5}x([1-9]\d{2,3})(?:[^\d]|$)/.exec(
    pathAndQuery
  );

  if (resolutionMatch) {
    return `${resolutionMatch[1]}p`;
  }

  return undefined;
}

function looksLikeMediaSegment(parsedUrl: URL): boolean {
  const pathname = parsedUrl.pathname.toLowerCase();
  const filename = pathname.split("/").pop() ?? "";

  return (
    /(?:^|[-_.])(?:seg|segment|frag|fragment|chunk)[-_.]?\d+/.test(filename) ||
    /(?:^|[-_.])\d{3,}(?:[-_.](?:seg|fragment|chunk))/.test(filename)
  );
}

function isQualitySegment(value: string): boolean {
  return /^\d{3,4}p$/.test(value) || /^\d{3,5}x\d{3,5}$/.test(value);
}

function isVariantSegment(value: string): boolean {
  return /^(?:variant|quality|rendition)[-_]?\d*$/.test(value);
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
