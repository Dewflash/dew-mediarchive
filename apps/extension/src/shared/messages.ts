export const PAGE_MEDIA_DETECTED_MESSAGE = "dew:page-media-detected";

export type PageMediaDetectedMessage = {
  type: typeof PAGE_MEDIA_DETECTED_MESSAGE;
  url: string;
  pageUrl: string;
  pageTitle?: string;
};

export type ExtensionMessage = PageMediaDetectedMessage;

export function isPageMediaDetectedMessage(
  message: unknown
): message is PageMediaDetectedMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<PageMediaDetectedMessage>;

  return (
    candidate.type === PAGE_MEDIA_DETECTED_MESSAGE &&
    typeof candidate.url === "string" &&
    typeof candidate.pageUrl === "string" &&
    (candidate.pageTitle === undefined || typeof candidate.pageTitle === "string")
  );
}
