import { classifyMediaUrl } from "../detector/mediaUrlClassifier";
import {
  DETECTION_MODEL_VERSION,
  type DetectedMedia,
  type MediaKind,
  type PageMediaDetectedMessage
} from "../shared";

type RequestDetails = chrome.webRequest.WebRequestBodyDetails & {
  documentUrl?: string;
};

export async function createDetectedMediaFromRequest(
  details: RequestDetails
): Promise<DetectedMedia | undefined> {
  const classification = classifyMediaUrl(details.url);

  if (classification.status === "ignored") {
    return undefined;
  }

  const tab = await getTab(details.tabId);
  const now = new Date().toISOString();
  const pageUrl = details.documentUrl ?? tab?.url ?? "";
  const pageTitle = tab?.title;
  const baseRecord = {
    id: createMediaId(details.tabId, classification.normalizedUrl),
    url: classification.normalizedUrl,
    pageUrl,
    pageTitle,
    kind:
      classification.status === "candidate"
        ? classification.kind
        : inferUnsupportedKind(classification.normalizedUrl),
    detectedAt: now,
    provenance: {
      source: "network-request" as const,
      detectorVersion: DETECTION_MODEL_VERSION,
      requestId: details.requestId,
      initiator: details.initiator
    }
  };

  if (classification.status === "candidate") {
    return {
      ...baseRecord,
      status: "candidate",
      label: classification.label,
      quality: classification.quality,
      streamGroupKey: classification.streamGroupKey,
      streamRole: classification.streamRole
    };
  }

  return {
    ...baseRecord,
    status: "unsupported",
    unsupportedReason: classification.reason,
    message: classification.message
  };
}

export function createDetectedMediaFromPageMessage(
  message: PageMediaDetectedMessage,
  tabId: number
): DetectedMedia | undefined {
  const classification = classifyMediaUrl(message.url);

  if (classification.status === "ignored") {
    return undefined;
  }

  const now = new Date().toISOString();
  const baseRecord = {
    id: createMediaId(tabId, classification.normalizedUrl),
    url: classification.normalizedUrl,
    pageUrl: message.pageUrl,
    pageTitle: message.pageTitle,
    mediaElementIndex: message.mediaElementIndex,
    mediaTitle: message.mediaTitle,
    kind:
      classification.status === "candidate"
        ? classification.kind
        : inferUnsupportedKind(classification.normalizedUrl),
    detectedAt: now,
    provenance: {
      source: "page-video-element" as const,
      detectorVersion: DETECTION_MODEL_VERSION
    }
  };

  if (classification.status === "candidate") {
    return {
      ...baseRecord,
      status: "candidate",
      label: classification.label,
      quality: classification.quality,
      streamGroupKey: classification.streamGroupKey,
      streamRole: classification.streamRole
    };
  }

  return {
    ...baseRecord,
    status: "unsupported",
    unsupportedReason: classification.reason,
    message: classification.message
  };
}

function inferUnsupportedKind(url: string): MediaKind {
  if (url.includes(".m3u8")) {
    return "hls";
  }

  if (url.includes(".mpd")) {
    return "dash";
  }

  return "unknown";
}

async function getTab(tabId: number): Promise<chrome.tabs.Tab | undefined> {
  if (tabId < 0) {
    return undefined;
  }

  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return undefined;
  }
}

function createMediaId(tabId: number, url: string): string {
  return `tab-${tabId}-${hashString(url)}`;
}

function hashString(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
