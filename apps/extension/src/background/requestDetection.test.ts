import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDetectedMediaFromPageMessage,
  createDetectedMediaFromRequest
} from "./requestDetection";

describe("createDetectedMediaFromRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("chrome", {
      tabs: {
        get: vi.fn(async () => ({
          id: 42,
          title: "Smoke Page",
          url: "https://example.test/watch"
        }))
      }
    });
  });

  it("normalizes a supported request into a media candidate", async () => {
    const detectedMedia = await createDetectedMediaFromRequest({
      requestId: "request-1",
      url: "https://cdn.example.test/video/master.m3u8",
      tabId: 42,
      frameId: 0,
      parentFrameId: -1,
      timeStamp: Date.now(),
      type: "xmlhttprequest",
      initiator: "https://example.test",
      method: "GET",
      requestBody: {}
    });

    expect(detectedMedia).toMatchObject({
      status: "candidate",
      kind: "hls",
      label: "HLS stream · Auto best quality",
      streamGroupKey: "https://cdn.example.test/video",
      streamRole: "master-playlist",
      url: "https://cdn.example.test/video/master.m3u8",
      pageUrl: "https://example.test/watch",
      pageTitle: "Smoke Page",
      provenance: {
        source: "network-request",
        requestId: "request-1",
        initiator: "https://example.test"
      }
    });
  });

  it("ignores stream fragments from network requests", async () => {
    const detectedMedia = await createDetectedMediaFromRequest({
      requestId: "request-fragment",
      url: "https://cdn.example.test/video/1080p/segment-00001.m4s?token=123",
      tabId: 42,
      frameId: 0,
      parentFrameId: -1,
      timeStamp: Date.now(),
      type: "xmlhttprequest",
      initiator: "https://example.test",
      method: "GET",
      requestBody: {}
    });

    expect(detectedMedia).toBeUndefined();
  });

  it("returns undefined for ignored non-media requests", async () => {
    const detectedMedia = await createDetectedMediaFromRequest({
      requestId: "request-2",
      url: "https://example.test/player.js",
      tabId: 42,
      frameId: 0,
      parentFrameId: -1,
      timeStamp: Date.now(),
      type: "script",
      method: "GET",
      requestBody: {}
    });

    expect(detectedMedia).toBeUndefined();
  });

  it("normalizes unsupported blocked platform requests", async () => {
    const detectedMedia = await createDetectedMediaFromRequest({
      requestId: "request-3",
      url: "https://youtube.com/watch?v=abc123",
      tabId: 42,
      frameId: 0,
      parentFrameId: -1,
      timeStamp: Date.now(),
      type: "main_frame",
      method: "GET",
      requestBody: {}
    });

    expect(detectedMedia).toMatchObject({
      status: "unsupported",
      unsupportedReason: "blocked-platform",
      kind: "unknown",
      message: "This platform is intentionally unsupported."
    });
  });

  it("normalizes a page media message into a media candidate", () => {
    const detectedMedia = createDetectedMediaFromPageMessage(
      {
        type: "dew:page-media-detected",
        url: "http://127.0.0.1:8765/sample.mp4",
        pageUrl: "http://127.0.0.1:8765/index.html",
        pageTitle: "Dew Smoke Test",
        mediaElementIndex: 2,
        mediaTitle: "Flower clip"
      },
      42
    );

    expect(detectedMedia).toMatchObject({
      status: "candidate",
      kind: "mp4",
      label: "MP4 video",
      url: "http://127.0.0.1:8765/sample.mp4",
      pageUrl: "http://127.0.0.1:8765/index.html",
      pageTitle: "Dew Smoke Test",
      mediaElementIndex: 2,
      mediaTitle: "Flower clip",
      provenance: {
        source: "page-video-element"
      }
    });
  });

  it("ignores non-media page messages", () => {
    const detectedMedia = createDetectedMediaFromPageMessage(
      {
        type: "dew:page-media-detected",
        url: "https://example.test/player.js",
        pageUrl: "https://example.test/watch"
      },
      42
    );

    expect(detectedMedia).toBeUndefined();
  });
});
