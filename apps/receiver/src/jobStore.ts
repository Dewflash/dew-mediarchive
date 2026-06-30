import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { DownloadJob, DownloadRequest } from "./types.js";

export class FileJobStore {
  private readonly jobs = new Map<string, DownloadJob>();
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly jobsPath: string) {}

  async load(): Promise<void> {
    let content: string;

    try {
      content = await readFile(this.jobsPath, "utf8");
    } catch (error) {
      if (isMissingFileError(error)) {
        return;
      }

      throw error;
    }

    for (const line of content.split("\n")) {
      if (!line.trim()) {
        continue;
      }

      const job = JSON.parse(line) as DownloadJob;
      this.jobs.set(job.id, job);
    }
  }

  async create(request: DownloadRequest): Promise<DownloadJob> {
    const now = new Date().toISOString();
    const job: DownloadJob = {
      ...request,
      id: crypto.randomUUID(),
      status: "queued",
      createdAt: now,
      updatedAt: now
    };

    await this.save(job);
    return job;
  }

  async update(
    jobId: string,
    patch: Partial<Pick<DownloadJob, "status" | "outputPath" | "error">>
  ): Promise<DownloadJob | undefined> {
    const previousJob = this.jobs.get(jobId);

    if (!previousJob) {
      return undefined;
    }

    const nextJob: DownloadJob = {
      ...previousJob,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    await this.save(nextJob);
    return nextJob;
  }

  get(jobId: string): DownloadJob | undefined {
    return this.jobs.get(jobId);
  }

  list(): DownloadJob[] {
    return [...this.jobs.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  private async save(job: DownloadJob): Promise<void> {
    this.jobs.set(job.id, job);
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.jobsPath), { recursive: true });
      await appendFile(this.jobsPath, `${JSON.stringify(job)}\n`, "utf8");
    });

    await this.writeQueue;
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
