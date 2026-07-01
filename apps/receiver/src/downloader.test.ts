import { describe, expect, it } from "vitest";
import { parseYtDlpProgressLine } from "./downloader.js";

describe("parseYtDlpProgressLine", () => {
  it("parses yt-dlp progress-template output", () => {
    expect(
      parseYtDlpProgressLine(
        "dew-progress: 42.5%|1.2MiB|2.8MiB|800KiB/s|00:03"
      )
    ).toMatchObject({
      downloaded: "1.2MiB",
      eta: "00:03",
      percent: 42.5,
      speed: "800KiB/s",
      stage: "downloading",
      total: "2.8MiB"
    });
  });

  it("ignores non-progress output", () => {
    expect(parseYtDlpProgressLine("[download] Destination: video.mp4")).toBeUndefined();
  });

  it("omits unavailable progress values", () => {
    expect(
      parseYtDlpProgressLine("dew-progress:N/A|Unknown|NA|Unknown B/s|N/A")
    ).toMatchObject({
      downloaded: undefined,
      eta: undefined,
      percent: undefined,
      speed: undefined,
      stage: "downloading",
      total: undefined
    });
  });
});
