import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createReceiverServer } from "../src/server.js";
import { FileArchiveStore } from "../src/archiveStore.js";
import { FileJobStore } from "../src/jobStore.js";
import type {
  ArchiveRecord,
  DownloadJob,
  Downloader,
  ReceiverConfig
} from "../src/types.js";

describe("receiver server", () => {
  let tempDir: string;
  let server: ReturnType<typeof createReceiverServer>;
  let baseUrl: string;
  let config: ReceiverConfig;
  let jobStore: FileJobStore;
  let archiveStore: FileArchiveStore;
  let downloadedJobs: DownloadJob[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "dew-receiver-test-"));
    config = {
      host: "127.0.0.1",
      port: 0,
      downloadDir: join(tempDir, "downloads"),
      jobsPath: join(tempDir, "jobs.jsonl"),
      archivePath: join(tempDir, "archive.jsonl"),
      ytDlpPath: "yt-dlp",
      bodyLimitBytes: 64 * 1024
    };
    jobStore = new FileJobStore(config.jobsPath);
    archiveStore = new FileArchiveStore(config.archivePath);
    downloadedJobs = [];

    const downloader: Downloader = {
      async download(job) {
        const outputPath = join(config.downloadDir, "flower.mp4");
        downloadedJobs.push(job);
        await mkdir(config.downloadDir, { recursive: true });
        await writeFile(outputPath, "flower video bytes", "utf8");
        return { outputPath };
      }
    };

    server = createReceiverServer({
      config,
      jobStore,
      archiveStore,
      downloader
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, config.host, () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://${config.host}:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await rm(tempDir, { recursive: true, force: true });
  });

  it("responds to health checks", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: "chrome-extension://example"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "chrome-extension://example"
    );
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      name: "dew-mediarchive-receiver"
    });
  });

  it("redirects the root route to the local library", async () => {
    const response = await fetch(`${baseUrl}/`, {
      redirect: "manual"
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/library");
  });

  it("renders an empty local library", async () => {
    const response = await fetch(`${baseUrl}/library`, {
      headers: {
        Origin: "chrome-extension://example"
      }
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Dew MediArchive");
    expect(html).toContain("0 saved items");
    expect(html).toContain("No saved media yet");
  });

  it("rejects normal website origins", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: "https://example.test"
      }
    });

    expect(response.status).toBe(403);
  });

  it("allows localhost tooling origins with ports", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: "http://localhost:5173"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173"
    );
  });

  it("creates and completes a download job", async () => {
    const response = await fetch(`${baseUrl}/downloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "chrome-extension://example"
      },
      body: JSON.stringify({
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        pageUrl: "https://interactive-examples.mdn.mozilla.net/",
        pageTitle: "MDN Flower",
        kind: "mp4"
      })
    });

    expect(response.status).toBe(202);
    const body = (await response.json()) as { job: DownloadJob };
    expect(body.job).toMatchObject({
      status: "queued",
      kind: "mp4"
    });

    const completedJob = await waitForJobStatus(body.job.id, "completed");

    expect(completedJob).toMatchObject({
      status: "completed",
      outputPath: join(config.downloadDir, "flower.mp4")
    });
    expect(downloadedJobs).toHaveLength(1);
  });

  it("writes an archive record for completed downloads", async () => {
    const response = await fetch(`${baseUrl}/downloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "chrome-extension://example"
      },
      body: JSON.stringify({
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        pageUrl: "https://interactive-examples.mdn.mozilla.net/",
        pageTitle: "MDN Flower",
        kind: "mp4"
      })
    });
    const body = (await response.json()) as { job: DownloadJob };
    const completedJob = await waitForJobStatus(body.job.id, "completed");
    const archiveResponse = await fetch(`${baseUrl}/archive`, {
      headers: {
        Origin: "chrome-extension://example"
      }
    });
    const archiveBody = (await archiveResponse.json()) as {
      records: ArchiveRecord[];
    };

    expect(archiveResponse.status).toBe(200);
    expect(archiveBody.records).toHaveLength(1);
    expect(archiveBody.records[0]).toMatchObject({
      jobId: completedJob.id,
      sourceUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      pageUrl: "https://interactive-examples.mdn.mozilla.net/",
      pageTitle: "MDN Flower",
      kind: "mp4",
      outputPath: join(config.downloadDir, "flower.mp4"),
      byteSize: 18
    });
    expect(archiveBody.records[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("renders archive records in the local library", async () => {
    await createCompletedDownload({
      pageTitle: "MDN Flower"
    });

    const response = await fetch(`${baseUrl}/library`, {
      headers: {
        Origin: "chrome-extension://example"
      }
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("1 saved item");
    expect(html).toContain("MDN Flower");
    expect(html).toContain("flower.mp4");
    expect(html).toContain("18 B");
    expect(html).toContain("mp4");
  });

  it("escapes untrusted archive metadata in the local library", async () => {
    await createCompletedDownload({
      pageTitle: "<script>alert(1)</script>"
    });

    const response = await fetch(`${baseUrl}/library`, {
      headers: {
        Origin: "chrome-extension://example"
      }
    });
    const html = await response.text();

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("rejects unsupported download URL schemes", async () => {
    const response = await fetch(`${baseUrl}/downloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "chrome-extension://example"
      },
      body: JSON.stringify({
        url: "file:///private/secret.mp4"
      })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "url must be an http or https URL."
    });
  });

  it("rejects malformed JSON bodies", async () => {
    const response = await fetch(`${baseUrl}/downloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "chrome-extension://example"
      },
      body: "{"
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Request body must be valid JSON."
    });
  });

  async function waitForJobStatus(
    jobId: string,
    status: DownloadJob["status"]
  ): Promise<DownloadJob> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const job = jobStore.get(jobId);

      if (job?.status === status) {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for job ${jobId} to become ${status}.`);
  }

  async function createCompletedDownload({
    pageTitle
  }: {
    pageTitle: string;
  }): Promise<DownloadJob> {
    const response = await fetch(`${baseUrl}/downloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "chrome-extension://example"
      },
      body: JSON.stringify({
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        pageUrl: "https://interactive-examples.mdn.mozilla.net/",
        pageTitle,
        kind: "mp4"
      })
    });
    const body = (await response.json()) as { job: DownloadJob };

    return waitForJobStatus(body.job.id, "completed");
  }
});
