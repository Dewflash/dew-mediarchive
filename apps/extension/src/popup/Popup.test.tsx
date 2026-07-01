// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Popup } from "./Popup";
import type { MediaDetectionSnapshot } from "../shared";

const storageGet = vi.fn();
const storageAddListener = vi.fn();
const storageRemoveListener = vi.fn();
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
    storageAddListener.mockReset();
    storageRemoveListener.mockReset();
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
      storage: {
        session: {
          get: storageGet
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
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
      ])
    });

    render(<Popup />);

    expect(await screen.findByText("1 item found")).toBeInTheDocument();
    expect(screen.getByText("MP4 video")).toBeInTheDocument();
    expect(screen.getByText("cdn.example.test/video.mp4")).toBeInTheDocument();
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
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
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
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
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
        createCandidate("media-1", "https://cdn.example.test/video.mp4")
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
      pageTitle: "Smoke Page",
      kind: "mp4"
    });
    expect(await screen.findByText("Saved locally.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
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
      await screen.findByText("Local receiver is not running.")
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
  url: string
): MediaDetectionSnapshot["candidates"][number] {
  return {
    id,
    url,
    pageUrl: "https://example.test/watch",
    pageTitle: "Smoke Page",
    status: "candidate",
    kind: "mp4",
    label: "MP4 video",
    detectedAt: new Date().toISOString(),
    provenance: {
      source: "network-request",
      detectorVersion: "test"
    }
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
