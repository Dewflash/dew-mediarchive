import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createReceiverServer } from "../src/server.js";
import { FileJobStore } from "../src/jobStore.js";
import type { DownloadJob, Downloader, ReceiverConfig } from "../src/types.js";

describe("receiver server", () => {
  let tempDir: string;
  let server: ReturnType<typeof createReceiverServer>;
  let baseUrl: string;
  let config: ReceiverConfig;
  let jobStore: FileJobStore;
  let downloadedJobs: DownloadJob[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "dew-receiver-test-"));
    config = {
      host: "127.0.0.1",
      port: 0,
      downloadDir: join(tempDir, "downloads"),
      jobsPath: join(tempDir, "jobs.jsonl"),
      ytDlpPath: "yt-dlp",
      bodyLimitBytes: 64 * 1024
    };
    jobStore = new FileJobStore(config.jobsPath);
    downloadedJobs = [];

    const downloader: Downloader = {
      async download(job) {
        downloadedJobs.push(job);
        return { outputPath: join(config.downloadDir, "flower.mp4") };
      }
    };

    server = createReceiverServer({
      config,
      jobStore,
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
});
