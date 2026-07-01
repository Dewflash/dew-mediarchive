import { describe, expect, it } from "vitest";
import { classifyMediaUrl } from "./mediaUrlClassifier";

describe("classifyMediaUrl", () => {
  it("classifies HLS playlists as media candidates", () => {
    expect(
      classifyMediaUrl("https://cdn.example.com/video/master.m3u8?token=123")
    ).toMatchObject({
      status: "candidate",
      kind: "hls",
      label: "HLS stream · Auto best quality",
      streamRole: "master-playlist"
    });
  });

  it("classifies quality-specific HLS playlists as variants", () => {
    expect(
      classifyMediaUrl("https://cdn.example.com/video/1080p/playlist.m3u8")
    ).toMatchObject({
      status: "candidate",
      kind: "hls",
      label: "HLS stream variant · 1080p",
      quality: "1080p",
      streamGroupKey: "https://cdn.example.com/video",
      streamRole: "variant-playlist"
    });
  });

  it("does not collapse unrelated root-level playlists into one stream group", () => {
    expect(classifyMediaUrl("https://cdn.example.com/master.m3u8?stream=one")).toMatchObject({
      status: "candidate",
      streamGroupKey: "https://cdn.example.com/master.m3u8?stream=one"
    });
    expect(classifyMediaUrl("https://cdn.example.com/master.m3u8?stream=two")).toMatchObject({
      status: "candidate",
      streamGroupKey: "https://cdn.example.com/master.m3u8?stream=two"
    });
  });

  it("classifies direct MP4 files as media candidates", () => {
    expect(classifyMediaUrl("https://media.example.com/file.MP4")).toMatchObject({
      status: "candidate",
      kind: "mp4",
      label: "MP4 video"
    });
  });

  it("does not ignore normal MP4 filenames that happen to contain part numbers", () => {
    expect(
      classifyMediaUrl("https://media.example.com/course/part-1.mp4")
    ).toMatchObject({
      status: "candidate",
      kind: "mp4",
      label: "MP4 video"
    });
  });

  it("classifies DASH manifests as media candidates", () => {
    expect(classifyMediaUrl("https://cdn.example.com/manifest.mpd")).toMatchObject({
      status: "candidate",
      kind: "dash",
      label: "DASH stream · Auto best quality"
    });
  });

  it("ignores common media segment files", () => {
    expect(classifyMediaUrl("https://cdn.example.com/chunk001.ts")).toEqual({
      status: "ignored",
      reason: "media-segment"
    });
    expect(
      classifyMediaUrl("https://cdn.example.com/video/segment-001.m4s?token=123")
    ).toEqual({
      status: "ignored",
      reason: "media-segment"
    });
    expect(
      classifyMediaUrl("https://cdn.example.com/video/seg-00012.mp4?token=123")
    ).toEqual({
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
