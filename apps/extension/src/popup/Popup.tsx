import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMediaSnapshotStorageKey,
  readMediaDetectionSnapshot,
  type DetectedMedia,
  type MediaCandidate,
  type MediaDetectionSnapshot
} from "../shared";
import {
  RECEIVER_BASE_URL,
  saveMediaToReceiver,
  type ReceiverDownloadJob,
  type ReceiverDownloadProgress,
  type ReceiverDownloadJobStatus
} from "./receiverClient";

type PopupState =
  | { status: "loading" }
  | { status: "ready"; tabId: number; snapshot?: MediaDetectionSnapshot }
  | { status: "error"; message: string };

type SaveStatus = ReceiverDownloadJobStatus | "saving" | "unavailable";

type SaveState = {
  status: SaveStatus;
  message: string;
  outputPath?: string;
  progress?: ReceiverDownloadProgress;
};

export function Popup() {
  const [popupState, setPopupState] = useState<PopupState>({ status: "loading" });
  const [copiedMediaId, setCopiedMediaId] = useState<string | undefined>();
  const [copyErrorMediaId, setCopyErrorMediaId] = useState<string | undefined>();
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const isMountedRef = useRef(true);
  const saveControllersRef = useRef(new Map<string, AbortController>());

  useEffect(() => {
    let isMounted = true;
    let activeTabId: number | undefined;
    isMountedRef.current = true;

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
      isMountedRef.current = false;
      abortActiveSaves(saveControllersRef.current);
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

  async function saveMediaUrl(media: DetectedMedia) {
    if (media.status !== "candidate") {
      return;
    }

    saveControllersRef.current.get(media.id)?.abort();
    const saveController = new AbortController();
    saveControllersRef.current.set(media.id, saveController);

    setSaveState(media.id, {
      status: "saving",
      message: "Sending to local receiver."
    });

    try {
      const finalJob = await saveMediaToReceiver(media, {
        onJobUpdate(job) {
          setSaveStateIfActive(
            media.id,
            saveController,
            getSaveStateFromJob(job)
          );
        },
        signal: saveController.signal
      });

      setSaveStateIfActive(
        media.id,
        saveController,
        getSaveStateFromJob(finalJob)
      );
    } catch (error) {
      if (saveController.signal.aborted || !isMountedRef.current) {
        return;
      }

      setSaveStateIfActive(media.id, saveController, {
        status: "unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Dew could not reach the local receiver."
      });
    } finally {
      if (saveControllersRef.current.get(media.id) === saveController) {
        saveControllersRef.current.delete(media.id);
      }
    }
  }

  function setSaveState(mediaId: string, saveState: SaveState) {
    setSaveStates((currentSaveStates) => ({
      ...currentSaveStates,
      [mediaId]: saveState
    }));
  }

  function setSaveStateIfActive(
    mediaId: string,
    saveController: AbortController,
    saveState: SaveState
  ) {
    if (
      !isMountedRef.current ||
      saveController.signal.aborted ||
      saveControllersRef.current.get(mediaId) !== saveController
    ) {
      return;
    }

    setSaveState(mediaId, saveState);
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
        onSave={saveMediaUrl}
        popupState={popupState}
        saveStates={saveStates}
      />
    </main>
  );
}

function PopupContent({
  copiedMediaId,
  copyErrorMediaId,
  mediaItems,
  onCopy,
  onSave,
  popupState,
  saveStates
}: {
  copiedMediaId: string | undefined;
  copyErrorMediaId: string | undefined;
  mediaItems: DetectedMedia[];
  onCopy: (media: DetectedMedia) => Promise<void>;
  onSave: (media: DetectedMedia) => Promise<void>;
  popupState: PopupState;
  saveStates: Record<string, SaveState>;
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
        <MediaItem
          copiedMediaId={copiedMediaId}
          copyErrorMediaId={copyErrorMediaId}
          key={media.id}
          media={media}
          onCopy={onCopy}
          onSave={onSave}
          saveState={saveStates[media.id]}
        />
      ))}
    </section>
  );
}

function MediaItem({
  copiedMediaId,
  copyErrorMediaId,
  media,
  onCopy,
  onSave,
  saveState
}: {
  copiedMediaId: string | undefined;
  copyErrorMediaId: string | undefined;
  media: DetectedMedia;
  onCopy: (media: DetectedMedia) => Promise<void>;
  onSave: (media: DetectedMedia) => Promise<void>;
  saveState: SaveState | undefined;
}) {
  return (
    <article className="media-item">
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
        {saveState ? (
          <div className="media-item__save">
            <p
              className={`media-item__message media-item__message--${getSaveMessageTone(saveState.status)}`}
            >
              {saveState.message}
            </p>
            {saveState.progress ? (
              <SaveProgress progress={saveState.progress} />
            ) : null}
            {saveState.outputPath ? (
              <p className="media-item__path" title={saveState.outputPath}>
                {formatOutputPath(saveState.outputPath)}
              </p>
            ) : null}
            {saveState.status === "completed" ? (
              <a
                className="media-item__library-link"
                href={`${RECEIVER_BASE_URL}/library`}
                rel="noreferrer"
                target="_blank"
              >
                View library
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {media.status === "candidate" ? (
        <div className="media-item__actions">
          <button
            className="media-item__button media-item__button--secondary"
            onClick={() => {
              void onCopy(media);
            }}
            type="button"
          >
            {copiedMediaId === media.id ? "Copied" : "Copy"}
          </button>
          <button
            className="media-item__button"
            disabled={isSaveBusy(saveState)}
            onClick={() => {
              void onSave(media);
            }}
            type="button"
          >
            {getSaveButtonLabel(saveState)}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function SaveProgress({ progress }: { progress: ReceiverDownloadProgress }) {
  const roundedPercent =
    progress.percent === undefined ? undefined : Math.round(progress.percent);
  const progressDetails = formatProgressDetails(progress);

  return (
    <div className="media-item__progress">
      <div
        aria-label="Download progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={roundedPercent}
        className="media-item__progress-track"
        role="progressbar"
      >
        <span
          className="media-item__progress-fill"
          style={{
            width:
              roundedPercent === undefined
                ? "100%"
                : `${Math.min(100, Math.max(0, roundedPercent))}%`
          }}
        />
      </div>
      {progressDetails ? (
        <p className="media-item__progress-details">{progressDetails}</p>
      ) : null}
    </div>
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

function getSaveStateFromJob(job: ReceiverDownloadJob): SaveState {
  if (job.status === "completed") {
    return {
      status: job.status,
      message: job.reusedArchiveRecord
        ? "Already saved. Using existing local file."
        : "Saved locally. Added to library.",
      outputPath: job.outputPath,
      progress: job.progress
    };
  }

  if (job.status === "failed") {
    return {
      status: job.status,
      progress: job.progress,
      message:
        job.error ||
        "Save failed in the local receiver. Copy the URL and test it with yt-dlp."
    };
  }

  if (job.status === "downloading") {
    const percent =
      job.progress?.percent === undefined
        ? ""
        : ` ${Math.round(job.progress.percent)}%`;

    return {
      status: job.status,
      message: `Downloading locally.${percent}`,
      progress: job.progress
    };
  }

  return {
    status: job.status,
    message: "Queued in local receiver.",
    progress: job.progress
  };
}

function getSaveButtonLabel(saveState: SaveState | undefined): string {
  if (!saveState) {
    return "Save";
  }

  if (saveState.status === "saving") {
    return "Saving";
  }

  if (saveState.status === "queued") {
    return "Queued";
  }

  if (saveState.status === "downloading") {
    return "Saving";
  }

  if (saveState.status === "completed") {
    return "Saved";
  }

  return "Retry";
}

function isSaveBusy(saveState: SaveState | undefined): boolean {
  return (
    saveState?.status === "saving" ||
    saveState?.status === "queued" ||
    saveState?.status === "downloading"
  );
}

function getSaveMessageTone(status: SaveStatus): "success" | "error" | "neutral" {
  if (status === "completed") {
    return "success";
  }

  if (status === "failed" || status === "unavailable") {
    return "error";
  }

  return "neutral";
}

function abortActiveSaves(saveControllers: Map<string, AbortController>) {
  for (const saveController of saveControllers.values()) {
    saveController.abort();
  }

  saveControllers.clear();
}

function formatUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname}${parsedUrl.pathname}`;
  } catch {
    return url;
  }
}

function formatOutputPath(outputPath: string): string {
  const normalizedPath = outputPath.replaceAll("\\", "/");
  const pathParts = normalizedPath.split("/").filter(Boolean);

  if (pathParts.length <= 3) {
    return outputPath;
  }

  return `.../${pathParts.slice(-3).join("/")}`;
}

function formatProgressDetails(progress: ReceiverDownloadProgress): string {
  const sizeText =
    progress.downloaded && progress.total
      ? `${progress.downloaded} / ${progress.total}`
      : progress.downloaded;
  const detailParts = [
    sizeText,
    progress.speed ? `${progress.speed}` : undefined,
    progress.eta ? `ETA ${progress.eta}` : undefined
  ].filter(Boolean);

  return detailParts.join(" · ");
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
