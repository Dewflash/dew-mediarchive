import { describe, expect, it } from "vitest";
import { isPageMediaDetectedMessage } from "./messages";

describe("isPageMediaDetectedMessage", () => {
  it("accepts well-formed page media messages", () => {
    expect(
      isPageMediaDetectedMessage({
        type: "dew:page-media-detected",
        url: "https://example.test/video.mp4",
        pageUrl: "https://example.test/watch",
        pageTitle: "Example"
      })
    ).toBe(true);
  });

  it("rejects malformed page media messages", () => {
    expect(isPageMediaDetectedMessage(undefined)).toBe(false);
    expect(isPageMediaDetectedMessage(null)).toBe(false);
    expect(isPageMediaDetectedMessage({ type: "dew:page-media-detected" })).toBe(false);
    expect(
      isPageMediaDetectedMessage({
        type: "dew:page-media-detected",
        url: "https://example.test/video.mp4",
        pageUrl: 123
      })
    ).toBe(false);
  });
});
