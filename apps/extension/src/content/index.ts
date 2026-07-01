const PAGE_MEDIA_DETECTED_MESSAGE = "dew:page-media-detected";
const sentUrls = new Set<string>();

type PageMediaItem = {
  mediaElementIndex: number;
  mediaTitle: string;
  url: string;
};

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
  for (const mediaItem of collectMediaItems()) {
    const normalizedUrl = normalizeUrl(mediaItem.url);

    if (!normalizedUrl || sentUrls.has(normalizedUrl)) {
      continue;
    }

    sentUrls.add(normalizedUrl);
    chrome.runtime.sendMessage(
      {
        type: PAGE_MEDIA_DETECTED_MESSAGE,
        url: normalizedUrl,
        pageUrl: window.location.href,
        pageTitle: document.title,
        mediaElementIndex: mediaItem.mediaElementIndex,
        mediaTitle: mediaItem.mediaTitle
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  }
}

function collectMediaItems(): PageMediaItem[] {
  const mediaItems: PageMediaItem[] = [];
  const mediaElements = Array.from(document.querySelectorAll("video, audio"));

  mediaElements.forEach((element, index) => {
    if (!(element instanceof HTMLMediaElement)) {
      return;
    }

    const mediaElementIndex = index + 1;
    const mediaTitle = getMediaTitle(element, mediaElementIndex);
    const elementUrls = new Set<string>();

    if (element.currentSrc) {
      elementUrls.add(element.currentSrc);
    }

    if (element.src) {
      elementUrls.add(element.src);
    }

    for (const source of element.querySelectorAll("source")) {
      if (source instanceof HTMLSourceElement && source.src) {
        elementUrls.add(source.src);
      }
    }

    for (const url of elementUrls) {
      mediaItems.push({
        mediaElementIndex,
        mediaTitle,
        url
      });
    }
  });

  return mediaItems;
}

function normalizeUrl(rawUrl: string): string | undefined {
  try {
    return new URL(rawUrl, document.baseURI).href;
  } catch {
    return undefined;
  }
}

function getMediaTitle(
  mediaElement: HTMLMediaElement,
  mediaElementIndex: number
): string {
  return (
    getDirectMediaTitle(mediaElement) ??
    getFigcaptionTitle(mediaElement) ??
    getNearbyTitle(mediaElement) ??
    `${isAudioElement(mediaElement) ? "Audio" : "Video"} ${mediaElementIndex}`
  );
}

function getDirectMediaTitle(
  mediaElement: HTMLMediaElement
): string | undefined {
  return sanitizeMediaTitle(
    mediaElement.getAttribute("aria-label") ??
      mediaElement.getAttribute("title") ??
      mediaElement.getAttribute("data-title") ??
      mediaElement.getAttribute("data-name") ??
      undefined
  );
}

function getFigcaptionTitle(
  mediaElement: HTMLMediaElement
): string | undefined {
  const figure = mediaElement.closest("figure");
  const caption = figure?.querySelector("figcaption");

  return sanitizeMediaTitle(caption?.textContent ?? undefined);
}

function getNearbyTitle(mediaElement: HTMLMediaElement): string | undefined {
  const container = mediaElement.closest("article, section, li, div");
  const heading = container?.querySelector(
    "h1, h2, h3, h4, h5, h6, [aria-label], [data-title]"
  );
  const headingText =
    heading?.getAttribute("aria-label") ??
    heading?.getAttribute("data-title") ??
    heading?.textContent ??
    undefined;

  return (
    sanitizeMediaTitle(headingText) ??
    sanitizeMediaTitle(mediaElement.previousElementSibling?.textContent ?? undefined)
  );
}

function sanitizeMediaTitle(value: string | undefined): string | undefined {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();

  if (
    !normalizedValue ||
    normalizedValue.length < 3 ||
    normalizedValue.length > 180 ||
    /^https?:\/\//i.test(normalizedValue) ||
    /^(play|video|audio|watch)$/i.test(normalizedValue)
  ) {
    return undefined;
  }

  return normalizedValue.slice(0, 120);
}

function isAudioElement(mediaElement: HTMLMediaElement): boolean {
  return mediaElement.tagName.toLowerCase() === "audio";
}
