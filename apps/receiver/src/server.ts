import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";
import { stat } from "node:fs/promises";
import { URL } from "node:url";
import type {
  ArchiveRecord,
  DownloadProgress,
  Downloader,
  ReceiverConfig
} from "./types.js";
import {
  renderArchiveCsvExport,
  renderArchiveJsonExport
} from "./archiveExport.js";
import { FileArchiveStore } from "./archiveStore.js";
import { FileJobStore } from "./jobStore.js";
import {
  filterAndSortArchiveRecords,
  getLibraryOptionsFromSearchParams,
  type LibraryArchiveRecord,
  renderLibraryPage
} from "./libraryView.js";
import { renderPrivacyPage } from "./privacyView.js";
import { validateDownloadRequest } from "./validation.js";

export type ReceiverServerOptions = {
  config: ReceiverConfig;
  jobStore: FileJobStore;
  archiveStore: FileArchiveStore;
  downloader: Downloader;
};

export function createReceiverServer({
  config,
  jobStore,
  archiveStore,
  downloader
}: ReceiverServerOptions): Server {
  return createServer(async (request, response) => {
    try {
      await handleRequest(
        request,
        response,
        config,
        jobStore,
        archiveStore,
        downloader
      );
    } catch {
      sendJson(response, 500, { error: "Internal receiver error." });
    }
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: ReceiverConfig,
  jobStore: FileJobStore,
  archiveStore: FileArchiveStore,
  downloader: Downloader
): Promise<void> {
  if (!isAllowedOrigin(request.headers.origin)) {
    sendJson(response, 403, { error: "Origin is not allowed." });
    return;
  }

  setCorsHeaders(response, request.headers.origin);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${config.host}:${config.port}`);

  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(302, {
      Location: "/library"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      name: "dew-mediarchive-receiver",
      version: "0.1.0"
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/downloads") {
    sendJson(response, 200, { jobs: jobStore.list() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/archive") {
    sendJson(response, 200, { records: archiveStore.list() });
    return;
  }

  if (request.method === "GET" && url.pathname === "/library") {
    const libraryRecords = await annotateLibraryRecords(archiveStore.list());

    sendHtml(
      response,
      200,
      renderLibraryPage(
        libraryRecords,
        getLibraryOptionsFromSearchParams(url.searchParams),
        jobStore.list()
      )
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/privacy") {
    sendHtml(response, 200, renderPrivacyPage());
    return;
  }

  if (request.method === "GET" && url.pathname === "/export/archive.json") {
    const records = filterAndSortArchiveRecords(
      archiveStore.list(),
      getLibraryOptionsFromSearchParams(url.searchParams)
    );
    sendExport(
      response,
      200,
      "application/json; charset=utf-8",
      "dew-mediarchive.json",
      renderArchiveJsonExport(records)
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/export/archive.csv") {
    const records = filterAndSortArchiveRecords(
      archiveStore.list(),
      getLibraryOptionsFromSearchParams(url.searchParams)
    );
    sendExport(
      response,
      200,
      "text/csv; charset=utf-8",
      "dew-mediarchive.csv",
      renderArchiveCsvExport(records)
    );
    return;
  }

  const downloadJobId = matchDownloadJobPath(url.pathname);

  if (request.method === "GET" && downloadJobId) {
    const job = jobStore.get(downloadJobId);

    if (!job) {
      sendJson(response, 404, { error: "Download job was not found." });
      return;
    }

    sendJson(response, 200, { job });
    return;
  }

  if (request.method === "POST" && url.pathname === "/downloads") {
    await handleCreateDownload(
      request,
      response,
      config,
      jobStore,
      archiveStore,
      downloader
    );
    return;
  }

  const downloadJobIdToRemove = matchDownloadJobRemovePath(url.pathname);

  if (request.method === "POST" && downloadJobIdToRemove) {
    const job = jobStore.get(downloadJobIdToRemove);

    if (!job) {
      sendJson(response, 404, { error: "Download job was not found." });
      return;
    }

    if (job.status !== "failed") {
      sendJson(response, 409, {
        error: "Only failed download jobs can be cleared."
      });
      return;
    }

    await jobStore.remove(downloadJobIdToRemove);

    response.writeHead(303, {
      Location: "/library"
    });
    response.end();
    return;
  }

  const archiveRecordIdToRemove = matchArchiveRemovePath(url.pathname);

  if (request.method === "POST" && archiveRecordIdToRemove) {
    const removed = await archiveStore.remove(archiveRecordIdToRemove);

    if (!removed) {
      sendJson(response, 404, { error: "Archive record was not found." });
      return;
    }

    response.writeHead(303, {
      Location: "/library"
    });
    response.end();
    return;
  }

  sendJson(response, 404, { error: "Route was not found." });
}

async function handleCreateDownload(
  request: IncomingMessage,
  response: ServerResponse,
  config: ReceiverConfig,
  jobStore: FileJobStore,
  archiveStore: FileArchiveStore,
  downloader: Downloader
): Promise<void> {
  const contentType = request.headers["content-type"] ?? "";

  if (!contentType.includes("application/json")) {
    sendJson(response, 415, { error: "Content-Type must be application/json." });
    return;
  }

  let body: string;

  try {
    body = await readRequestBody(request, config.bodyLimitBytes);
  } catch {
    sendJson(response, 413, { error: "Request body is too large." });
    return;
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(body) as unknown;
  } catch {
    sendJson(response, 400, { error: "Request body must be valid JSON." });
    return;
  }

  const validation = validateDownloadRequest(parsedBody);

  if (!validation.ok) {
    sendJson(response, 400, { error: validation.message });
    return;
  }

  const existingRecord = archiveStore.findBySourceUrl(validation.value.url);

  if (existingRecord) {
    const job = await jobStore.create(validation.value);
    const completedJob = await jobStore.update(job.id, {
      archiveRecordId: existingRecord.id,
      outputPath: existingRecord.outputPath,
      reusedArchiveRecord: true,
      status: "completed"
    });

    sendJson(response, 200, { job: completedJob ?? job });
    return;
  }

  const job = await jobStore.create(validation.value);
  void runDownloadJob(job.id, config, jobStore, archiveStore, downloader);
  sendJson(response, 202, { job });
}

async function annotateLibraryRecords(
  records: ArchiveRecord[]
): Promise<LibraryArchiveRecord[]> {
  return Promise.all(
    records.map(async (record) => ({
      ...record,
      fileStatus: (await fileExists(record.outputPath)) ? "available" : "missing"
    }))
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fileStats = await stat(filePath);
    return fileStats.isFile();
  } catch {
    return false;
  }
}

async function runDownloadJob(
  jobId: string,
  config: ReceiverConfig,
  jobStore: FileJobStore,
  archiveStore: FileArchiveStore,
  downloader: Downloader
): Promise<void> {
  const downloadingJob = await jobStore.update(jobId, {
    status: "downloading"
  });

  if (!downloadingJob) {
    return;
  }

  try {
    const result = await downloader.download(downloadingJob, config, {
      onProgress: createProgressReporter(jobId, jobStore)
    });
    let archiveRecordId: string | undefined;

    if (result.outputPath) {
      const archiveRecord = await archiveStore.createFromCompletedJob({
        ...downloadingJob,
        status: "completed",
        outputPath: result.outputPath,
        updatedAt: new Date().toISOString()
      });
      archiveRecordId = archiveRecord?.id;
    }

    await jobStore.update(jobId, {
      archiveRecordId,
      progress: {
        stage: "processing",
        percent: 100,
        updatedAt: new Date().toISOString()
      },
      status: "completed",
      outputPath: result.outputPath,
      error: undefined
    });
  } catch (error) {
    await jobStore.update(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Download failed."
    });
  }
}

function createProgressReporter(
  jobId: string,
  jobStore: FileJobStore
): (progress: DownloadProgress) => void {
  let lastProgressAt = 0;
  let lastPercent: number | undefined;

  return (progress) => {
    const now = Date.now();

    if (
      progress.percent !== undefined &&
      lastPercent !== undefined &&
      Math.abs(progress.percent - lastPercent) < 1 &&
      now - lastProgressAt < 1500
    ) {
      return;
    }

    lastProgressAt = now;
    lastPercent = progress.percent ?? lastPercent;

    void jobStore.update(jobId, {
      progress,
      status: "downloading"
    });
  };
}

function readRequestBody(
  request: IncomingMessage,
  limitBytes: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    request.on("data", (chunk: Buffer) => {
      receivedBytes += chunk.length;

      if (receivedBytes > limitBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("error", reject);
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>
): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

function sendHtml(response: ServerResponse, statusCode: number, body: string): void {
  response.writeHead(statusCode, {
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    "Content-Type": "text/html; charset=utf-8"
  });
  response.end(body);
}

function sendExport(
  response: ServerResponse,
  statusCode: number,
  contentType: string,
  filename: string,
  body: string
): void {
  response.writeHead(statusCode, {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Type": contentType
  });
  response.end(body);
}

function setCorsHeaders(response: ServerResponse, origin: string | undefined): void {
  if (!origin) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (origin.startsWith("chrome-extension://")) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);

    return (
      parsedOrigin.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(parsedOrigin.hostname)
    );
  } catch {
    return false;
  }
}

function matchDownloadJobPath(pathname: string): string | undefined {
  const match = /^\/downloads\/([^/]+)$/.exec(pathname);
  return match?.[1];
}

function matchDownloadJobRemovePath(pathname: string): string | undefined {
  const match = /^\/downloads\/([^/]+)\/remove$/.exec(pathname);
  if (!match) {
    return undefined;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

function matchArchiveRemovePath(pathname: string): string | undefined {
  const match = /^\/archive\/([^/]+)\/remove$/.exec(pathname);
  if (!match) {
    return undefined;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}
