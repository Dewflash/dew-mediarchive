import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDetectedMediaFromRequest } from "./requestDetection";

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
      label: "HLS stream",
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
});
