// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Popup } from "./Popup";
import type { MediaCandidate, MediaDetectionSnapshot } from "../shared";

const storageGet = vi.fn();
const storageSet = vi.fn();
const storageRemove = vi.fn();
const storageAddListener = vi.fn();
const storageRemoveListener = vi.fn();
const setBadgeText = vi.fn();
const tabsQuery = vi.fn();
const writeText = vi.fn();
const fetchMock = vi.fn();

let storageChangeHandler:
  | ((
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => void)
  | undefined;

describe("Popup", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/popup.html");
    storageChangeHandler = undefined;
    storageGet.mockReset();
    storageSet.mockReset();
    storageRemove.mockReset();
    storageAddListener.mockReset();
    storageRemoveListener.mockReset();
    setBadgeText.mockReset();
    tabsQuery.mockReset();
    writeText.mockReset();
    fetchMock.mockReset();

    tabsQuery.mockResolvedValue([
      {
        id: 7,
        title: "Smoke Page",
        url: "https://example.test/watch"
      }
    ]);

    storageAddListener.mockImplementation((handler) => {
      storageChangeHandler = handler;
    });

    vi.stubGlobal("chrome", {
      action: {
        setBadgeText
      },
      storage: {
        session: {
          get: storageGet,
          set: storageSet,
          remove: storageRemove
        },
        onChanged: {
          addListener: storageAddListener,
          removeListener: storageRemoveListener
        }
      },
      tabs: {
        query: tabsQuery
      }
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText
      }
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the empty state when no media snapshot exists", async () => {
    storageGet.mockResolvedValue({});

    render(<Popup />);

    expect(await screen.findByText("No media detected yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Start playback on a page with authorized non-DRM media/)
    ).toBeInTheDocument();
  });

  it("renders candidates from the active tab snapshot", async () => {
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4", {
          mediaTitle: "Launch trailer"
        })
      ])
    });

    render(<Popup />);

    expect(await screen.findByText("1 item found")).toBeInTheDocument();
    expect(screen.getByText("MP4 video")).toBeInTheDocument();
    expect(screen.getByText("Launch trailer")).toBeInTheDocument();
    expect(screen.getByText("cdn.example.test/video.mp4")).toBeInTheDocument();
  });

  it("clears detected media and saved progress for the current tab", async () => {
    storageGet.mockImplementation(async (key: string) => {
      if (key === "media-snapshot:7") {
        return {
          [key]: createSnapshot([
            createCandidate("media-1", "https://cdn.example.test/video.mp4")
          ])
        };
      }

      if (key === "save-jobs:7") {
        return {
          [key]: {
            "media-1": {
              jobId: "job-1",
              mediaId: "media-1",
              saveState: {
                message: "Saved locally. Added to library.",
                status: "completed"
              },
              updatedAt: new Date().toISOString()
            }
          }
        };
      }

      return {};
    });

    render(<Popup />);

    expect(await screen.findByText("1 item found")).toBeInTheDocument();
    expect(screen.getByText("Saved locally. Added to library.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear temp" }));

    expect(storageRemove).toHaveBeenCalledWith("media-snapshot:7");
    expect(storageRemove).toHaveBeenCalledWith("save-jobs:7");
    expect(setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: ""
    });
    expect(await screen.findByText("No media detected yet")).toBeInTheDocument();
    expect(
      screen.queryByText("Saved locally. Added to library.")
    ).not.toBeInTheDocument();
  });

  it("shows downloadable candidates before unsupported observations", async () => {
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createUnsupported("unsupported-1", "blob:https://example.test/video"),
        createCandidate("media-1", "https://cdn.example.test/video.mp4", {
          mediaTitle: "Downloadable clip"
        })
      ])
    });

    render(<Popup />);

    expect(await screen.findByText("2 items found")).toBeInTheDocument();
    const downloadableTitle = screen.getByText("Downloadable clip");
    const unsupportedTitle = screen.getByText("Video 1");

    expect(
      downloadableTitle.compareDocumentPosition(unsupportedTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("uses page titles for title-less network candidates", async () => {
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate(
          "media-1",
          "https://cdn.example.test/streaming/one/master.m3u8",
          {
            kind: "hls",
            label: "HLS stream",
            mediaElementIndex: undefined,
            mediaTitle: undefined,
            pageTitle: "Progress Bar"
          }
        ),
        createCandidate(
          "media-2",
          "https://cdn.example.test/streaming/two/master.m3u8",
          {
            kind: "hls",
            label: "HLS stream",
            mediaElementIndex: undefined,
            mediaTitle: undefined,
            pageTitle: "Progress Bar"
          }
        )
      ])
    });

    render(<Popup />);

    expect(await screen.findByText("2 items found")).toBeInTheDocument();
    expect(screen.getByText("Progress Bar · HLS stream 1")).toBeInTheDocument();
    expect(screen.getByText("Progress Bar · HLS stream 2")).toBeInTheDocument();
    expect(
      screen.getByText("cdn.example.test/streaming/one/master.m3u8")
    ).toBeInTheDocument();
    expect(
      screen.getByText("cdn.example.test/streaming/two/master.m3u8")
    ).toBeInTheDocument();
  });

  it("can render a requested tab snapshot for verification", async () => {
    window.history.replaceState(null, "", "/popup.html?tabId=42");
    storageGet.mockResolvedValue({
      "media-snapshot:42": {
        ...createSnapshot([
          createCandidate("media-1", "https://cdn.example.test/video.mp4")
        ]),
        tabId: 42
      }
    });

    render(<Popup />);

    expect(await screen.findByText("1 item found")).toBeInTheDocument();
    expect(screen.getByText("cdn.example.test/video.mp4")).toBeInTheDocument();
    expect(tabsQuery).not.toHaveBeenCalled();
  });

  it("ignores invalid requested tab ids", async () => {
    window.history.replaceState(null, "", "/popup.html?tabId=not-a-tab");
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4", {
          mediaElementIndex: undefined,
          mediaTitle: undefined,
          pageTitle: "Progress Bar"
        })
      ])
    });

    render(<Popup />);

    expect(await screen.findByText("1 item found")).toBeInTheDocument();
    expect(tabsQuery).toHaveBeenCalledWith({
      active: true,
      currentWindow: true
    });
  });

  it("copies a candidate URL and shows copied state", async () => {
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4", {
          mediaElementIndex: undefined,
          mediaTitle: undefined,
          pageTitle: "Progress Bar"
        })
      ])
    });

    render(<Popup />);

    await userEvent.click(await screen.findByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("https://cdn.example.test/video.mp4");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("sends a candidate URL to the local receiver and shows saved state", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("queued")
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("completed", {
            outputPath: "/Users/example/Movies/Dew MediArchive/video.mp4"
          })
        })
      );
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4", {
          mediaElementIndex: undefined,
          mediaTitle: undefined,
          pageTitle: "Progress Bar"
        })
      ])
    });

    render(<Popup />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:47321/downloads",
        expect.objectContaining({
          method: "POST"
        })
      );
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      url: "https://cdn.example.test/video.mp4",
      pageUrl: "https://example.test/watch",
      pageTitle: "Progress Bar",
      mediaTitle: "Progress Bar",
      kind: "mp4"
    });
    expect(await screen.findByText("Saved locally. Added to library.")).toBeInTheDocument();
    expect(
      screen.getByText(".../Movies/Dew MediArchive/video.mp4")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View library" })).toHaveAttribute(
      "href",
      "http://127.0.0.1:47321/library"
    );
    expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
  });

  it("shows when Save reuses an already archived file", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        job: createReceiverJob("completed", {
          outputPath: "/Users/example/Movies/Dew MediArchive/video.mp4",
          reusedArchiveRecord: true
        })
      })
    );
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
      ])
    });

    render(<Popup />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Already saved. Using existing local file.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
  });

  it("shows receiver download progress while saving", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("queued")
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("downloading", {
            progress: {
              downloaded: "512KiB",
              eta: "00:01",
              percent: 42,
              speed: "1.0MiB/s",
              stage: "downloading",
              total: "1.2MiB",
              updatedAt: new Date().toISOString()
            }
          })
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("completed", {
            outputPath: "/Users/example/Movies/Dew MediArchive/video.mp4",
            progress: {
              percent: 100,
              stage: "processing",
              updatedAt: new Date().toISOString()
            }
          })
        })
      );
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
      ])
    });

    render(<Popup />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(await screen.findByText("Downloading locally. 42%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Download progress" })).toHaveAttribute(
      "aria-valuenow",
      "42"
    );
    expect(screen.getByText("512KiB / 1.2MiB · 1.0MiB/s · ETA 00:01")).toBeInTheDocument();
  });

  it("restores saved receiver jobs and resumes progress polling", async () => {
    storageGet.mockImplementation(async (key: string) => {
      if (key === "media-snapshot:7") {
        return {
          [key]: createSnapshot([
            createCandidate("media-1", "https://cdn.example.test/video.mp4")
          ])
        };
      }

      if (key === "save-jobs:7") {
        return {
          [key]: {
            "media-1": {
              jobId: "job-1",
              mediaId: "media-1",
              saveState: {
                message: "Queued in local receiver.",
                status: "queued"
              },
              updatedAt: new Date().toISOString()
            }
          }
        };
      }

      return {};
    });
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("downloading", {
            progress: {
              downloaded: "512KiB",
              eta: "00:01",
              percent: 42,
              speed: "1.0MiB/s",
              stage: "downloading",
              total: "1.2MiB",
              updatedAt: new Date().toISOString()
            }
          })
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("completed", {
            outputPath: "/Users/example/Movies/Dew MediArchive/video.mp4",
            progress: {
              percent: 100,
              stage: "processing",
              updatedAt: new Date().toISOString()
            }
          })
        })
      );

    render(<Popup />);

    expect(await screen.findByText("Downloading locally. 42%")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:47321/downloads/job-1",
      expect.any(Object)
    );
    expect(screen.getByRole("progressbar", { name: "Download progress" })).toHaveAttribute(
      "aria-valuenow",
      "42"
    );
  });

  it("shows a receiver unavailable state when Save cannot connect", async () => {
    fetchMock.mockRejectedValue(new Error("connection refused"));
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
      ])
    });

    render(<Popup />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Local receiver is not running. Double-click Dew.command, then retry."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows receiver download failures and allows retry", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("queued")
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          job: createReceiverJob("failed", {
            error: "yt-dlp could not download this URL."
          })
        })
      );
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
      ])
    });

    render(<Popup />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("yt-dlp could not download this URL.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows a copy failure state when clipboard write fails", async () => {
    writeText.mockRejectedValue(new Error("clipboard denied"));
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
      ])
    });

    render(<Popup />);

    await userEvent.click(await screen.findByRole("button", { name: "Copy" }));

    expect(await screen.findByText("Copy failed. Try again.")).toBeInTheDocument();
  });

  it("renders unsupported media without a copy button", async () => {
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        {
          ...createCandidate("media-1", "blob:https://example.test/video"),
          status: "unsupported",
          unsupportedReason: "unsupported-scheme",
          message: "Only http and https media URLs are supported."
        }
      ])
    });

    render(<Popup />);

    expect(await screen.findByText("unsupported scheme")).toBeInTheDocument();
    expect(
      screen.getByText("Only http and https media URLs are supported.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("shows receiver activity below detected and unsupported media", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === "http://127.0.0.1:47321/downloads") {
        return createJsonResponse({
          jobs: [
            createReceiverJob("completed", {
              id: "job-complete",
              mediaTitle: "Completed clip"
            }),
            createReceiverJob("downloading", {
              id: "job-downloading",
              mediaTitle: "Previous page clip",
              progress: {
                downloaded: "512KiB",
                eta: "00:01",
                percent: 42,
                speed: "1.0MiB/s",
                stage: "downloading",
                total: "1.2MiB",
                updatedAt: new Date().toISOString()
              }
            }),
            createReceiverJob("failed", {
              error: "yt-dlp could not download this URL.",
              id: "job-failed",
              mediaTitle: "Broken clip"
            })
          ]
        });
      }

      return createJsonResponse({ error: "Unexpected request" }, 500);
    });
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/video.mp4", {
          mediaTitle: "Downloadable clip"
        }),
        createUnsupported("unsupported-1", "blob:https://example.test/video")
      ])
    });

    render(<Popup />);

    const unsupportedMessage = await screen.findByText(
      "Only http and https media URLs are supported."
    );
    const receiverHeading = await screen.findByRole(
      "region",
      { name: "Receiver activity" },
      { timeout: 2500 }
    );

    expect(receiverHeading).toBeInTheDocument();
    expect(screen.getByText("Previous page clip")).toBeInTheDocument();
    expect(screen.getByText("Downloading locally. 42%")).toBeInTheDocument();
    expect(screen.getByText("512KiB / 1.2MiB · 1.0MiB/s · ETA 00:01")).toBeInTheDocument();
    expect(screen.getByText("Broken clip")).toBeInTheDocument();
    expect(screen.getByText("yt-dlp could not download this URL.")).toBeInTheDocument();
    expect(screen.queryByText("Completed clip")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "href",
      "http://127.0.0.1:47321/library"
    );
    expect(
      unsupportedMessage.compareDocumentPosition(receiverHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("updates when the active tab snapshot changes", async () => {
    storageGet.mockResolvedValue({});

    render(<Popup />);

    expect(await screen.findByText("No media detected yet")).toBeInTheDocument();

    storageChangeHandler?.(
      {
        "media-snapshot:7": {
          newValue: createSnapshot([
            createCandidate("media-1", "https://cdn.example.test/live.mp4")
          ])
        }
      },
      "session"
    );

    await waitFor(() => {
      expect(screen.getByText("1 item found")).toBeInTheDocument();
    });
    expect(screen.getByText("cdn.example.test/live.mp4")).toBeInTheDocument();
  });

  it("keeps the visible media list if the tab snapshot clears while open", async () => {
    storageGet.mockResolvedValue({
      "media-snapshot:7": createSnapshot([
        createCandidate("media-1", "https://cdn.example.test/short.mp4")
      ])
    });

    render(<Popup />);

    expect(await screen.findByText("1 item found")).toBeInTheDocument();
    expect(screen.getByText("cdn.example.test/short.mp4")).toBeInTheDocument();

    storageChangeHandler?.(
      {
        "media-snapshot:7": {
          oldValue: createSnapshot([
            createCandidate("media-1", "https://cdn.example.test/short.mp4")
          ])
        }
      },
      "session"
    );

    expect(screen.getByText("1 item found")).toBeInTheDocument();
    expect(screen.getByText("cdn.example.test/short.mp4")).toBeInTheDocument();
  });

  it("stays empty when an empty tab snapshot clears while open", async () => {
    storageGet.mockResolvedValue({});

    render(<Popup />);

    expect(await screen.findByText("No media detected yet")).toBeInTheDocument();

    storageChangeHandler?.(
      {
        "media-snapshot:7": {}
      },
      "session"
    );

    expect(screen.getByText("No media detected yet")).toBeInTheDocument();
  });
});

function createSnapshot(
  candidates: MediaDetectionSnapshot["candidates"]
): MediaDetectionSnapshot {
  return {
    tabId: 7,
    pageUrl: "https://example.test/watch",
    pageTitle: "Smoke Page",
    updatedAt: new Date().toISOString(),
    candidates
  };
}

function createCandidate(
  id: string,
  url: string,
  overrides: Partial<MediaCandidate> = {}
): MediaDetectionSnapshot["candidates"][number] {
  return {
    id,
    url,
    pageUrl: "https://example.test/watch",
    pageTitle: "Smoke Page",
    mediaElementIndex: 1,
    mediaTitle: "Video 1",
    status: "candidate",
    kind: "mp4",
    label: "MP4 video",
    detectedAt: new Date().toISOString(),
    provenance: {
      source: "network-request",
      detectorVersion: "test"
    },
    ...overrides
  };
}

function createUnsupported(
  id: string,
  url: string
): MediaDetectionSnapshot["candidates"][number] {
  return {
    ...createCandidate(id, url),
    status: "unsupported",
    unsupportedReason: "unsupported-scheme",
    message: "Only http and https media URLs are supported."
  };
}

function createReceiverJob(
  status: "queued" | "downloading" | "completed" | "failed",
  overrides: Record<string, unknown> = {}
) {
  return {
    id: "job-1",
    status,
    url: "https://cdn.example.test/video.mp4",
    pageUrl: "https://example.test/watch",
    pageTitle: "Smoke Page",
    kind: "mp4",
    ...overrides
  };
}

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status
  });
}
