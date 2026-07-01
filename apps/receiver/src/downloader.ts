import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import type {
  DownloadJob,
  DownloadProgress,
  Downloader,
  DownloaderOptions,
  ReceiverConfig
} from "./types.js";

export class YtDlpDownloader implements Downloader {
  async download(
    job: DownloadJob,
    config: ReceiverConfig,
    options: DownloaderOptions = {}
  ): Promise<{ outputPath?: string }> {
    await mkdir(config.downloadDir, { recursive: true });

    const args = [
      "--newline",
      "--no-simulate",
      "--progress",
      "--restrict-filenames",
      "-P",
      config.downloadDir,
      "--progress-template",
      "download:dew-progress:%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
      "--print",
      "after_move:dew-file:%(filepath)s",
      job.url
    ];

    return runYtDlp(config.ytDlpPath, args, options);
  }
}

function runYtDlp(
  command: string,
  args: string[],
  options: DownloaderOptions
): Promise<{ outputPath?: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutLines: string[] = [];
    const stderrChunks: Buffer[] = [];
    let outputPath: string | undefined;
    let stdoutBuffer = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer = processStdoutChunk(
        `${stdoutBuffer}${chunk.toString("utf8")}`,
        (line) => {
          const progress = parseYtDlpProgressLine(line);

          if (progress) {
            options.onProgress?.(progress);
            return;
          }

          const nextOutputPath = parseYtDlpOutputPathLine(line);

          if (nextOutputPath) {
            outputPath = nextOutputPath;
            return;
          }

          stdoutLines.push(line);
        }
      );
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const stderr = Buffer.concat(stderrChunks).toString("utf8");

      if (stdoutBuffer.trim()) {
        const progress = parseYtDlpProgressLine(stdoutBuffer);
        const nextOutputPath = parseYtDlpOutputPathLine(stdoutBuffer);

        if (progress) {
          options.onProgress?.(progress);
        } else if (nextOutputPath) {
          outputPath = nextOutputPath;
        } else {
          stdoutLines.push(stdoutBuffer);
        }
      }

      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}.`));
        return;
      }

      resolve({
        outputPath: outputPath ?? getLastNonEmptyLine(stdoutLines.join("\n"))
      });
    });
  });
}

export function parseYtDlpProgressLine(
  line: string
): DownloadProgress | undefined {
  const rawProgress = line.trim();

  if (!rawProgress.startsWith("dew-progress:")) {
    return undefined;
  }

  const [percent, downloaded, total, speed, eta] = rawProgress
    .slice("dew-progress:".length)
    .split("|")
    .map(normalizeProgressValue);

  return {
    stage: "downloading",
    percent: parsePercent(percent),
    downloaded,
    total,
    speed,
    eta,
    updatedAt: new Date().toISOString()
  };
}

function parseYtDlpOutputPathLine(line: string): string | undefined {
  const rawLine = line.trim();

  if (!rawLine.startsWith("dew-file:")) {
    return undefined;
  }

  return rawLine.slice("dew-file:".length).trim() || undefined;
}

function processStdoutChunk(
  value: string,
  onLine: (line: string) => void
): string {
  const lines = value.split(/\r?\n/);
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    onLine(line);
  }

  return remainder;
}

function normalizeProgressValue(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();

  if (
    !normalizedValue ||
    normalizedValue === "NA" ||
    normalizedValue === "N/A" ||
    normalizedValue === "Unknown" ||
    normalizedValue.startsWith("Unknown ")
  ) {
    return undefined;
  }

  return normalizedValue;
}

function parsePercent(percent: string | undefined): number | undefined {
  if (!percent) {
    return undefined;
  }

  const parsedPercent = Number(percent.replace("%", "").trim());

  if (!Number.isFinite(parsedPercent)) {
    return undefined;
  }

  return Math.min(100, Math.max(0, parsedPercent));
}

function getLastNonEmptyLine(value: string): string | undefined {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}
