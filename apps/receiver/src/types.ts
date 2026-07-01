export type DownloadKind = "mp4" | "webm" | "audio" | "hls" | "dash" | "unknown";

export type DownloadRequest = {
  url: string;
  pageUrl?: string;
  pageTitle?: string;
  kind?: DownloadKind;
};

export type DownloadJobStatus = "queued" | "downloading" | "completed" | "failed";

export type DownloadProgress = {
  stage: "downloading" | "processing";
  percent?: number;
  downloaded?: string;
  total?: string;
  speed?: string;
  eta?: string;
  updatedAt: string;
};

export type DownloadJob = DownloadRequest & {
  id: string;
  status: DownloadJobStatus;
  createdAt: string;
  updatedAt: string;
  outputPath?: string;
  error?: string;
  archiveRecordId?: string;
  progress?: DownloadProgress;
  reusedArchiveRecord?: boolean;
};

export type ArchiveRecord = {
  id: string;
  jobId: string;
  sourceUrl: string;
  pageUrl?: string;
  pageTitle?: string;
  kind?: DownloadKind;
  outputPath: string;
  byteSize: number;
  sha256: string;
  capturedAt: string;
  createdAt: string;
};

export type ReceiverConfig = {
  host: string;
  port: number;
  downloadDir: string;
  jobsPath: string;
  archivePath: string;
  ytDlpPath: string;
  bodyLimitBytes: number;
};

export type DownloaderOptions = {
  onProgress?: (progress: DownloadProgress) => void;
};

export type Downloader = {
  download(
    job: DownloadJob,
    config: ReceiverConfig,
    options?: DownloaderOptions
  ): Promise<{ outputPath?: string }>;
};
