import { createReadStream } from "node:fs";
import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import type { ArchiveRecord, DownloadJob } from "./types.js";

export class FileArchiveStore {
  private readonly records = new Map<string, ArchiveRecord>();
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly archivePath: string) {}

  async load(): Promise<void> {
    let content: string;

    try {
      content = await readFile(this.archivePath, "utf8");
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

      const record = JSON.parse(line) as ArchiveRecord;
      this.records.set(record.id, record);
    }
  }

  async createFromCompletedJob(job: DownloadJob): Promise<ArchiveRecord | undefined> {
    if (job.status !== "completed" || !job.outputPath) {
      return undefined;
    }

    const fileStats = await stat(job.outputPath);
    const now = new Date().toISOString();
    const record: ArchiveRecord = {
      id: crypto.randomUUID(),
      jobId: job.id,
      sourceUrl: job.url,
      pageUrl: job.pageUrl,
      pageTitle: job.pageTitle,
      mediaTitle: job.mediaTitle,
      kind: job.kind,
      outputPath: job.outputPath,
      byteSize: fileStats.size,
      sha256: await hashFile(job.outputPath),
      capturedAt: job.updatedAt,
      createdAt: now
    };

    await this.save(record);
    return record;
  }

  list(): ArchiveRecord[] {
    return [...this.records.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  findBySourceUrl(sourceUrl: string): ArchiveRecord | undefined {
    return this.list().find((record) => record.sourceUrl === sourceUrl);
  }

  async remove(recordId: string): Promise<boolean> {
    const removeOperation = this.writeQueue.then(async () => {
      if (!this.records.has(recordId)) {
        return false;
      }

      const nextRecords = new Map(this.records);
      nextRecords.delete(recordId);
      await this.rewriteRecords(nextRecords);
      this.records.delete(recordId);
      return true;
    });

    this.writeQueue = removeOperation;
    return removeOperation;
  }

  private async save(record: ArchiveRecord): Promise<void> {
    this.records.set(record.id, record);
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.archivePath), { recursive: true });
      await appendFile(this.archivePath, `${JSON.stringify(record)}\n`, "utf8");
    });

    await this.writeQueue;
  }

  private async rewriteRecords(records: Map<string, ArchiveRecord>): Promise<void> {
    await mkdir(dirname(this.archivePath), { recursive: true });
    const body = [...records.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((record) => JSON.stringify(record))
      .join("\n");
    const nextBody = body ? `${body}\n` : "";
    const tempPath = `${this.archivePath}.tmp-${process.pid}-${Date.now()}`;

    await writeFile(tempPath, nextBody, "utf8");
    await rename(tempPath, this.archivePath);
  }
}

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
