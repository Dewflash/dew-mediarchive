import {
  appendDetectedMedia,
  clearTabSnapshot,
  readTabSnapshot,
  updateBadgeForSnapshot
} from "./mediaStore";
import { createDetectedMediaFromRequest } from "./requestDetection";

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
  { urls: ["<all_urls>"] }
);

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
