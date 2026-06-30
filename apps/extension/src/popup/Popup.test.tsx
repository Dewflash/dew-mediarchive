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

let storageChangeHandler:
  | ((
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => void)
  | undefined;

describe("Popup", () => {
  beforeEach(() => {
    storageChangeHandler = undefined;
    storageGet.mockReset();
    storageAddListener.mockReset();
    storageRemoveListener.mockReset();
    tabsQuery.mockReset();
    writeText.mockReset();

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
