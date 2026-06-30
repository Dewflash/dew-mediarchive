import { describe, expect, it } from "vitest";
import { classifyMediaUrl } from "./mediaUrlClassifier";

describe("classifyMediaUrl", () => {
  it("classifies HLS playlists as media candidates", () => {
    expect(
      classifyMediaUrl("https://cdn.example.com/video/master.m3u8?token=123")
    ).toMatchObject({
      status: "candidate",
      kind: "hls",
      label: "HLS stream"
    });
  });

  it("classifies direct MP4 files as media candidates", () => {
    expect(classifyMediaUrl("https://media.example.com/file.MP4")).toMatchObject({
      status: "candidate",
      kind: "mp4",
      label: "MP4 video"
    });
  });

  it("classifies DASH manifests as media candidates", () => {
    expect(classifyMediaUrl("https://cdn.example.com/manifest.mpd")).toMatchObject({
      status: "candidate",
      kind: "dash",
      label: "DASH stream"
    });
  });

  it("ignores common media segment files", () => {
    expect(classifyMediaUrl("https://cdn.example.com/chunk001.ts")).toEqual({
      status: "ignored",
      reason: "media-segment"
    });
  });

  it("ignores non-media URLs", () => {
    expect(classifyMediaUrl("https://example.com/player.js")).toEqual({
      status: "ignored",
      reason: "non-media-url"
    });
  });

  it("marks YouTube-hosted media as intentionally unsupported", () => {
    expect(
      classifyMediaUrl("https://rr1---sn.googlevideo.com/videoplayback")
    ).toMatchObject({
      status: "unsupported",
      reason: "blocked-platform"
    });
  });

  it("marks premium streaming platforms as DRM-likely unsupported", () => {
    expect(classifyMediaUrl("https://www.netflix.com/watch/123")).toMatchObject({
      status: "unsupported",
      reason: "drm-likely"
    });
  });

  it("marks blob URLs as unsupported scheme", () => {
    expect(classifyMediaUrl("blob:https://example.com/123")).toMatchObject({
      status: "unsupported",
      reason: "unsupported-scheme"
    });
  });

  it("ignores invalid URLs", () => {
    expect(classifyMediaUrl("not a url")).toEqual({
      status: "ignored",
      reason: "invalid-url"
    });
  });
});

