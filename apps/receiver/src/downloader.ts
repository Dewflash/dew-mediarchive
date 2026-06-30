import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import type { DownloadJob, Downloader, ReceiverConfig } from "./types.js";

export class YtDlpDownloader implements Downloader {
  async download(
    job: DownloadJob,
    config: ReceiverConfig
  ): Promise<{ outputPath?: string }> {
    await mkdir(config.downloadDir, { recursive: true });

    const args = [
      "--no-progress",
      "--no-simulate",
      "--restrict-filenames",
      "-P",
      config.downloadDir,
      "--print",
      "after_move:filepath",
      job.url
    ];

    return runYtDlp(config.ytDlpPath, args);
  }
}

function runYtDlp(
  command: string,
  args: string[]
): Promise<{ outputPath?: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");

      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}.`));
        return;
      }

      resolve({
        outputPath: getLastNonEmptyLine(stdout)
      });
    });
  });
}

function getLastNonEmptyLine(value: string): string | undefined {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}
