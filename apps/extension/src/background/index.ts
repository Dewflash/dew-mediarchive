import {
  appendDetectedMedia,
  clearTabSnapshot,
  readTabSnapshot,
  updateBadgeForSnapshot
} from "./mediaStore";
import {
  createDetectedMediaFromPageMessage,
  createDetectedMediaFromRequest
} from "./requestDetection";
import {
  isPageMediaDetectedMessage,
  PAGE_MEDIA_DETECTED_MESSAGE,
  type ExtensionMessage
} from "../shared";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.action.setBadgeText({ text: "" });
  void chrome.action.setBadgeBackgroundColor({ color: "#2563EB" });
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void updateActiveTabBadge(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void clearTabSnapshot(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    void clearTabAndBadge(tabId);
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    void handleBeforeRequest(details);
  },
  { urls: ["http://*/*", "https://*/*"] }
);

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  if (isPageMediaDetectedMessage(message)) {
    void handlePageMediaDetected(message, sender);
  }
});

async function handleBeforeRequest(
  details: chrome.webRequest.WebRequestBodyDetails
): Promise<void> {
  if (details.tabId < 0) {
    return;
  }

  const detectedMedia = await createDetectedMediaFromRequest(details);

  if (!detectedMedia) {
    return;
  }

  const snapshot = await appendDetectedMedia(
    details.tabId,
    detectedMedia.pageUrl,
    detectedMedia.pageTitle,
    detectedMedia
  );

  await updateBadgeForSnapshot(details.tabId, snapshot);
}

async function updateActiveTabBadge(tabId: number): Promise<void> {
  const snapshot = await readTabSnapshot(tabId);
  await updateBadgeForSnapshot(tabId, snapshot);
}

async function clearTabAndBadge(tabId: number): Promise<void> {
  await clearTabSnapshot(tabId);
  await updateBadgeForSnapshot(tabId, undefined);
}

async function handlePageMediaDetected(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<void> {
  if (message.type !== PAGE_MEDIA_DETECTED_MESSAGE || sender.tab?.id === undefined) {
    return;
  }

  const detectedMedia = createDetectedMediaFromPageMessage(message, sender.tab.id);

  if (!detectedMedia) {
    return;
  }

  const snapshot = await appendDetectedMedia(
    sender.tab.id,
    detectedMedia.pageUrl,
    detectedMedia.pageTitle,
    detectedMedia
  );

  await updateBadgeForSnapshot(sender.tab.id, snapshot);
}
