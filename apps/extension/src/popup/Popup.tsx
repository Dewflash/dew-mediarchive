import { useEffect, useMemo, useState } from "react";
import {
  getMediaSnapshotStorageKey,
  readMediaDetectionSnapshot,
  type DetectedMedia,
  type MediaDetectionSnapshot
} from "../shared";

type PopupState =
  | { status: "loading" }
  | { status: "ready"; tabId: number; snapshot?: MediaDetectionSnapshot }
  | { status: "error"; message: string };

export function Popup() {
  const [popupState, setPopupState] = useState<PopupState>({ status: "loading" });
  const [copiedMediaId, setCopiedMediaId] = useState<string | undefined>();
  const [copyErrorMediaId, setCopyErrorMediaId] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    let activeTabId: number | undefined;

    async function loadCurrentTabSnapshot() {
      try {
        const requestedTabId = getRequestedTabId(window.location.search);

        if (requestedTabId !== undefined) {
          activeTabId = requestedTabId;
          const snapshot = await readMediaDetectionSnapshot(requestedTabId);

          if (isMounted) {
            setPopupState({
              status: "ready",
              tabId: requestedTabId,
              snapshot
            });
          }
          return;
        }

        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

        if (activeTab?.id === undefined) {
          if (isMounted) {
            setPopupState({
              status: "error",
              message: "No active browser tab was found."
            });
          }
          return;
        }

        activeTabId = activeTab.id;
        const snapshot = await readMediaDetectionSnapshot(activeTab.id);

        if (isMounted) {
          setPopupState({
            status: "ready",
            tabId: activeTab.id,
            snapshot
          });
        }
      } catch {
        if (isMounted) {
          setPopupState({
            status: "error",
            message: "Dew could not read media detected for this tab."
          });
        }
      }
    }

    void loadCurrentTabSnapshot();

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (!isMounted || areaName !== "session" || activeTabId === undefined) {
        return;
      }

      const key = getMediaSnapshotStorageKey(activeTabId);
      const changedSnapshot = changes[key]?.newValue as
        | MediaDetectionSnapshot
        | undefined;
      const tabId = activeTabId;

      setPopupState((currentState) => {
        if (
          changedSnapshot === undefined &&
          currentState.status === "ready" &&
          currentState.snapshot?.candidates.length
        ) {
          return currentState;
        }

        return {
          status: "ready",
          tabId,
          snapshot: changedSnapshot
        };
      });
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      isMounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const mediaItems = useMemo(() => {
    if (popupState.status !== "ready") {
      return [];
    }

    return popupState.snapshot?.candidates ?? [];
  }, [popupState]);

  async function copyMediaUrl(media: DetectedMedia) {
    if (media.status !== "candidate") {
      return;
    }

    try {
      await navigator.clipboard.writeText(media.url);
      setCopiedMediaId(media.id);
      setCopyErrorMediaId(undefined);
    } catch {
      setCopiedMediaId(undefined);
      setCopyErrorMediaId(media.id);
    }
  }

  return (
    <main className="popup">
      <header className="popup__header">
        <div>
          <p className="popup__eyebrow">Dew MediArchive</p>
          <h1 className="popup__title">{getTitle(popupState, mediaItems.length)}</h1>
        </div>
      </header>

      <PopupContent
        copiedMediaId={copiedMediaId}
        copyErrorMediaId={copyErrorMediaId}
        mediaItems={mediaItems}
        onCopy={copyMediaUrl}
        popupState={popupState}
      />
    </main>
  );
}

function PopupContent({
  copiedMediaId,
  copyErrorMediaId,
  mediaItems,
  onCopy,
  popupState
}: {
  copiedMediaId: string | undefined;
  copyErrorMediaId: string | undefined;
  mediaItems: DetectedMedia[];
  onCopy: (media: DetectedMedia) => Promise<void>;
  popupState: PopupState;
}) {
  if (popupState.status === "loading") {
    return (
      <section className="popup__empty" aria-live="polite">
        <p>Checking this tab for detected media.</p>
      </section>
    );
  }

  if (popupState.status === "error") {
    return (
      <section className="popup__empty popup__empty--error" aria-live="polite">
        <p>{popupState.message}</p>
      </section>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <section className="popup__empty" aria-live="polite">
        <p>
          Start playback on a page with authorized non-DRM media. Dew will list
          detected candidates here.
        </p>
      </section>
    );
  }

  return (
    <section className="media-list" aria-live="polite">
      {mediaItems.map((media) => (
        <article className="media-item" key={media.id}>
          <div className="media-item__content">
            <div className="media-item__header">
              <span className="media-item__kind">{getMediaLabel(media)}</span>
              <span className={`media-item__status media-item__status--${media.status}`}>
                {media.status}
              </span>
            </div>
            <p className="media-item__url">{formatUrl(media.url)}</p>
            {media.status === "unsupported" ? (
              <p className="media-item__message">{media.message}</p>
            ) : null}
            {copyErrorMediaId === media.id ? (
              <p className="media-item__message">Copy failed. Try again.</p>
            ) : null}
          </div>

          {media.status === "candidate" ? (
            <button
              className="media-item__button"
              onClick={() => {
                void onCopy(media);
              }}
              type="button"
            >
              {copiedMediaId === media.id ? "Copied" : "Copy"}
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function getTitle(popupState: PopupState, mediaCount: number): string {
  if (popupState.status === "loading") {
    return "Checking tab";
  }

  if (popupState.status === "error") {
    return "Needs attention";
  }

  return mediaCount > 0
    ? `${mediaCount} item${mediaCount === 1 ? "" : "s"} found`
    : "No media detected yet";
}

function getMediaLabel(media: DetectedMedia): string {
  if (media.status === "candidate") {
    return media.label;
  }

  return media.unsupportedReason.replaceAll("-", " ");
}

function formatUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname}${parsedUrl.pathname}`;
  } catch {
    return url;
  }
}

function getRequestedTabId(search: string): number | undefined {
  const rawTabId = new URLSearchParams(search).get("tabId");

  if (!rawTabId) {
    return undefined;
  }

  const tabId = Number(rawTabId);

  if (!Number.isInteger(tabId) || tabId < 0) {
    return undefined;
  }

  return tabId;
}
