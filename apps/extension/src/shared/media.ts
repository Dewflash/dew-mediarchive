export const DETECTION_MODEL_VERSION = "0.1.0";

export type MediaKind = "hls" | "dash" | "mp4" | "webm" | "audio" | "unknown";

export type DetectionSource =
  | "network-request"
  | "page-video-element"
  | "manual-input";

export type UnsupportedReason =
  | "drm-likely"
  | "blocked-platform"
  | "unsupported-scheme"
  | "not-media"
  | "unknown";

export type DetectionStatus = "candidate" | "unsupported";

export type DetectionContext = {
  tabId: number;
  pageUrl: string;
  pageTitle?: string;
  frameId?: number;
  detectedAt: string;
};

export type MediaProvenance = {
  source: DetectionSource;
  detectorVersion: string;
  requestId?: string;
  initiator?: string;
};

export type DetectedMediaBase = {
  id: string;
  url: string;
  pageUrl: string;
  pageTitle?: string;
  mediaElementIndex?: number;
  mediaTitle?: string;
  kind: MediaKind;
  detectedAt: string;
  provenance: MediaProvenance;
};

export type MediaCandidate = DetectedMediaBase & {
  status: "candidate";
  label: string;
  mimeType?: string;
  quality?: string;
};

export type UnsupportedMedia = DetectedMediaBase & {
  status: "unsupported";
  unsupportedReason: UnsupportedReason;
  message: string;
};

export type DetectedMedia = MediaCandidate | UnsupportedMedia;

export type MediaDetectionSnapshot = {
  tabId: number;
  pageUrl?: string;
  pageTitle?: string;
  candidates: DetectedMedia[];
  updatedAt: string;
};
