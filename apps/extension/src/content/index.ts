const PAGE_MEDIA_DETECTED_MESSAGE = "dew:page-media-detected";
const sentUrls = new Set<string>();

scanPageMedia();
document.addEventListener("play", scanPageMedia, true);
document.addEventListener("loadedmetadata", scanPageMedia, true);

const observer = new MutationObserver(() => {
  scanPageMedia();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["src"]
});

function scanPageMedia() {
  for (const rawUrl of collectMediaUrls()) {
    const normalizedUrl = normalizeUrl(rawUrl);

    if (!normalizedUrl || sentUrls.has(normalizedUrl)) {
      continue;
    }

    sentUrls.add(normalizedUrl);
    chrome.runtime.sendMessage(
      {
        type: PAGE_MEDIA_DETECTED_MESSAGE,
        url: normalizedUrl,
        pageUrl: window.location.href,
        pageTitle: document.title
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  }
}

function collectMediaUrls(): string[] {
  const urls: string[] = [];

  for (const element of document.querySelectorAll("video, audio")) {
    if (element instanceof HTMLMediaElement && element.currentSrc) {
      urls.push(element.currentSrc);
    }

    if (element instanceof HTMLMediaElement && element.src) {
      urls.push(element.src);
    }
  }

  for (const source of document.querySelectorAll("video source, audio source")) {
    if (source instanceof HTMLSourceElement && source.src) {
      urls.push(source.src);
    }
  }

  return urls;
}

function normalizeUrl(rawUrl: string): string | undefined {
  try {
    return new URL(rawUrl, document.baseURI).href;
  } catch {
    return undefined;
  }
}
