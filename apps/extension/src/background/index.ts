chrome.runtime.onInstalled.addListener(() => {
  void chrome.action.setBadgeText({ text: "" });
  void chrome.action.setBadgeBackgroundColor({ color: "#2563EB" });
});

chrome.tabs.onActivated.addListener(() => {
  void chrome.action.setBadgeText({ text: "" });
});

