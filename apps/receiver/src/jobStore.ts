import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
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

    let shouldRewrite = false;

    for (const line of content.split("\n")) {
      if (!line.trim()) {
        continue;
      }

      const serializedJobs = splitSerializedJsonObjects(line);

      if (serializedJobs.length !== 1) {
        shouldRewrite = true;
      }

      for (const serializedJob of serializedJobs) {
        const job = JSON.parse(serializedJob) as DownloadJob;
        this.jobs.set(job.id, job);
      }
    }

    if (shouldRewrite) {
      await this.rewriteJobs(this.jobs);
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
    patch: Partial<
      Pick<
        DownloadJob,
        | "archiveRecordId"
        | "error"
        | "outputPath"
        | "progress"
        | "reusedArchiveRecord"
        | "status"
      >
    >
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

  async remove(jobId: string): Promise<boolean> {
    const removeOperation = this.writeQueue.then(async () => {
      if (!this.jobs.has(jobId)) {
        return false;
      }

      const nextJobs = new Map(this.jobs);
      nextJobs.delete(jobId);
      await this.rewriteJobs(nextJobs);
      this.jobs.delete(jobId);
      return true;
    });

    this.writeQueue = removeOperation;
    return removeOperation;
  }

  private async save(job: DownloadJob): Promise<void> {
    this.jobs.set(job.id, job);
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.jobsPath), { recursive: true });
      await appendFile(this.jobsPath, `${JSON.stringify(job)}\n`, "utf8");
    });

    await this.writeQueue;
  }

  private async rewriteJobs(jobs: Map<string, DownloadJob>): Promise<void> {
    await mkdir(dirname(this.jobsPath), { recursive: true });
    const body = [...jobs.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((job) => JSON.stringify(job))
      .join("\n");
    const nextBody = body ? `${body}\n` : "";
    const tempPath = `${this.jobsPath}.tmp-${process.pid}-${Date.now()}`;

    await writeFile(tempPath, nextBody, "utf8");
    await rename(tempPath, this.jobsPath);
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

function splitSerializedJsonObjects(line: string): string[] {
  const trimmedLine = line.trim();
  const objectRanges: Array<{ end: number; start: number }> = [];
  let depth = 0;
  let objectStart = -1;
  let isInString = false;
  let isEscaped = false;

  for (let index = 0; index < trimmedLine.length; index += 1) {
    const char = trimmedLine[index];

    if (isInString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        isInString = false;
      }

      continue;
    }

    if (char === '"') {
      isInString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        objectStart = index;
      }

      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0 && objectStart >= 0) {
        objectRanges.push({
          end: index + 1,
          start: objectStart
        });
        objectStart = -1;
      }
    }
  }

  if (depth !== 0 || isInString || objectRanges.length === 0) {
    return [trimmedLine];
  }

  let cursor = 0;

  for (const range of objectRanges) {
    if (trimmedLine.slice(cursor, range.start).trim()) {
      return [trimmedLine];
    }

    cursor = range.end;
  }

  if (trimmedLine.slice(cursor).trim()) {
    return [trimmedLine];
  }

  return objectRanges.map((range) => trimmedLine.slice(range.start, range.end));
}
