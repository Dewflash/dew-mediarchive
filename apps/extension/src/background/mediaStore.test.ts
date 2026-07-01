import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendDetectedMedia,
  clearTabSnapshot,
  readTabSnapshot,
  updateBadgeForSnapshot
} from "./mediaStore";
import type { DetectedMedia, MediaCandidate } from "../shared";

const sessionStorage = new Map<string, unknown>();
const setBadgeText = vi.fn();
const setBadgeBackgroundColor = vi.fn();

describe("mediaStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setBadgeText.mockClear();
    setBadgeBackgroundColor.mockClear();

    vi.stubGlobal("chrome", {
      action: {
        setBadgeText,
        setBadgeBackgroundColor
      },
      storage: {
        session: {
          get: vi.fn(async (key: string) => ({
            [key]: sessionStorage.get(key)
          })),
          set: vi.fn(async (values: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(values)) {
              sessionStorage.set(key, value);
            }
          }),
          remove: vi.fn(async (key: string) => {
            sessionStorage.delete(key);
          })
        }
      }
    });
  });

  it("appends detected media into a tab snapshot", async () => {
    const snapshot = await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("media-1", "https://cdn.example.test/video.mp4")
    );

    expect(snapshot).toMatchObject({
      tabId: 7,
      pageUrl: "https://example.test/watch",
      pageTitle: "Watch",
      candidates: [
        {
          id: "media-1",
          status: "candidate",
          url: "https://cdn.example.test/video.mp4"
        }
      ]
    });
  });

  it("upserts duplicate media by id", async () => {
    await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("media-1", "https://cdn.example.test/old.mp4")
    );

    const snapshot = await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("media-1", "https://cdn.example.test/new.mp4")
    );

    expect(snapshot.candidates).toHaveLength(1);
    expect(snapshot.candidates[0]?.url).toBe("https://cdn.example.test/new.mp4");
  });

  it("replaces stream variants with matching master playlists", async () => {
    await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("variant-720", "https://cdn.example.test/video/720p/playlist.m3u8", {
        kind: "hls",
        label: "HLS stream variant · 720p",
        quality: "720p",
        streamGroupKey: "https://cdn.example.test/video",
        streamRole: "variant-playlist"
      })
    );

    const snapshot = await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("master", "https://cdn.example.test/video/master.m3u8", {
        kind: "hls",
        label: "HLS stream · Auto best quality",
        streamGroupKey: "https://cdn.example.test/video",
        streamRole: "master-playlist"
      })
    );

    expect(snapshot.candidates).toHaveLength(1);
    expect(snapshot.candidates[0]).toMatchObject({
      id: "master",
      label: "HLS stream · Auto best quality",
      url: "https://cdn.example.test/video/master.m3u8"
    });
  });

  it("keeps the highest quality stream variant when no master playlist is seen", async () => {
    await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("variant-720", "https://cdn.example.test/video/720p/playlist.m3u8", {
        kind: "hls",
        label: "HLS stream variant · 720p",
        quality: "720p",
        streamGroupKey: "https://cdn.example.test/video",
        streamRole: "variant-playlist"
      })
    );

    const snapshot = await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("variant-1080", "https://cdn.example.test/video/1080p/playlist.m3u8", {
        kind: "hls",
        label: "HLS stream variant · 1080p",
        quality: "1080p",
        streamGroupKey: "https://cdn.example.test/video",
        streamRole: "variant-playlist"
      })
    );

    expect(snapshot.candidates).toHaveLength(1);
    expect(snapshot.candidates[0]).toMatchObject({
      id: "variant-1080",
      label: "HLS stream variant · 1080p",
      url: "https://cdn.example.test/video/1080p/playlist.m3u8"
    });
  });

  it("serializes concurrent appends for the same tab", async () => {
    await Promise.all([
      appendDetectedMedia(
        7,
        "https://example.test/watch",
        "Watch",
        createCandidate("media-1", "https://cdn.example.test/one.mp4")
      ),
      appendDetectedMedia(
        7,
        "https://example.test/watch",
        "Watch",
        createCandidate("media-2", "https://cdn.example.test/two.mp4")
      )
    ]);

    const snapshot = await readTabSnapshot(7);

    expect(snapshot?.candidates.map((candidate) => candidate.id).sort()).toEqual([
      "media-1",
      "media-2"
    ]);
  });

  it("updates the badge with candidate counts only", async () => {
    await updateBadgeForSnapshot(7, {
      tabId: 7,
      updatedAt: new Date().toISOString(),
      candidates: [
        createCandidate("media-1", "https://cdn.example.test/video.mp4"),
        {
          ...createCandidate("media-2", "blob:https://example.test/video"),
          status: "unsupported",
          unsupportedReason: "unsupported-scheme",
          message: "Only http and https media URLs are supported."
        }
      ]
    });

    expect(setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: "1"
    });
  });

  it("clears a tab snapshot", async () => {
    await appendDetectedMedia(
      7,
      "https://example.test/watch",
      "Watch",
      createCandidate("media-1", "https://cdn.example.test/video.mp4")
    );

    await clearTabSnapshot(7);

    await expect(readTabSnapshot(7)).resolves.toBeUndefined();
  });
});

function createCandidate(
  id: string,
  url: string,
  overrides: Partial<MediaCandidate> = {}
): MediaCandidate {
  return {
    id,
    url,
    pageUrl: "https://example.test/watch",
    pageTitle: "Watch",
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
