import { homedir } from "node:os";
import { join } from "node:path";
import type { ReceiverConfig } from "./types.js";

const DEFAULT_PORT = 47321;
const DEFAULT_BODY_LIMIT_BYTES = 64 * 1024;

export function createDefaultConfig(env = process.env): ReceiverConfig {
  const downloadDir =
    env.DEW_DOWNLOAD_DIR ?? join(homedir(), "Movies", "Dew MediArchive");

  return {
    host: env.DEW_RECEIVER_HOST ?? "127.0.0.1",
    port: parsePort(env.DEW_RECEIVER_PORT),
    downloadDir,
    jobsPath: env.DEW_JOBS_PATH ?? join(downloadDir, ".dew", "jobs.jsonl"),
    archivePath:
      env.DEW_ARCHIVE_PATH ?? join(downloadDir, ".dew", "archive.jsonl"),
    ytDlpPath: env.DEW_YT_DLP_PATH ?? "yt-dlp",
    bodyLimitBytes: parseBodyLimit(env.DEW_BODY_LIMIT_BYTES)
  };
}

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return DEFAULT_PORT;
  }

  return port;
}

function parseBodyLimit(rawLimit: string | undefined): number {
  if (!rawLimit) {
    return DEFAULT_BODY_LIMIT_BYTES;
  }

  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1024) {
    return DEFAULT_BODY_LIMIT_BYTES;
  }

  return limit;
}
