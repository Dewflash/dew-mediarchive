import type { MediaCandidate } from "../shared";

export const RECEIVER_BASE_URL = "http://127.0.0.1:47321";

export type ReceiverDownloadJobStatus =
  | "queued"
  | "downloading"
  | "completed"
  | "failed";

export type ReceiverDownloadProgress = {
  stage: "downloading" | "processing";
  percent?: number;
  downloaded?: string;
  total?: string;
  speed?: string;
  eta?: string;
  updatedAt: string;
};

export type ReceiverDownloadJob = {
  id: string;
  status: ReceiverDownloadJobStatus;
  url: string;
  pageUrl?: string;
  pageTitle?: string;
  kind?: MediaCandidate["kind"];
  outputPath?: string;
  error?: string;
  progress?: ReceiverDownloadProgress;
  reusedArchiveRecord?: boolean;
};

type ReceiverJobResponse = {
  job?: ReceiverDownloadJob;
  error?: string;
};

export type ReceiverSaveOptions = {
  fetcher?: typeof fetch;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  onJobUpdate?: (job: ReceiverDownloadJob) => void;
  signal?: AbortSignal;
};

const DEFAULT_POLL_INTERVAL_MS = 600;
const DEFAULT_MAX_POLL_ATTEMPTS = 100;

export async function saveMediaToReceiver(
  media: MediaCandidate,
  options: ReceiverSaveOptions = {}
): Promise<ReceiverDownloadJob> {
  const fetcher = options.fetcher ?? fetch;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPollAttempts = options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  const createdJob = await createDownloadJob(media, fetcher, options.signal);

  options.onJobUpdate?.(createdJob);

  if (isTerminalJob(createdJob)) {
    return createdJob;
  }

  return pollDownloadJob(createdJob.id, {
    fetcher,
    maxPollAttempts,
    onJobUpdate: options.onJobUpdate,
    pollIntervalMs,
    signal: options.signal
  });
}

export async function resumeReceiverDownloadJob(
  jobId: string,
  options: ReceiverSaveOptions = {}
): Promise<ReceiverDownloadJob> {
  return pollDownloadJob(jobId, {
    fetcher: options.fetcher ?? fetch,
    maxPollAttempts: options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS,
    onJobUpdate: options.onJobUpdate,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    signal: options.signal
  });
}

async function createDownloadJob(
  media: MediaCandidate,
  fetcher: typeof fetch,
  signal: AbortSignal | undefined
): Promise<ReceiverDownloadJob> {
  const response = await fetchReceiver(fetcher, `${RECEIVER_BASE_URL}/downloads`, {
    body: JSON.stringify({
      url: media.url,
      pageUrl: media.pageUrl,
      pageTitle: media.pageTitle,
      mediaTitle: getReceiverMediaTitle(media),
      kind: media.kind
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST",
    signal
  });

  return parseJobResponse(response);
}

function getReceiverMediaTitle(media: MediaCandidate): string | undefined {
  if (media.mediaTitle) {
    return media.mediaTitle;
  }

  if (media.mediaElementIndex !== undefined) {
    return `${media.kind === "audio" ? "Audio" : "Video"} ${media.mediaElementIndex}`;
  }

  return media.pageTitle?.trim() || undefined;
}

async function pollDownloadJob(
  jobId: string,
  options: Required<Pick<
    ReceiverSaveOptions,
    "fetcher" | "maxPollAttempts" | "pollIntervalMs"
  >> &
    Pick<ReceiverSaveOptions, "onJobUpdate" | "signal">
): Promise<ReceiverDownloadJob> {
  for (let attempt = 0; attempt < options.maxPollAttempts; attempt += 1) {
    throwIfAborted(options.signal);

    const response = await fetchReceiver(
      options.fetcher,
      `${RECEIVER_BASE_URL}/downloads/${encodeURIComponent(jobId)}`,
      {
        signal: options.signal
      }
    );
    const job = await parseJobResponse(response);

    options.onJobUpdate?.(job);

    if (isTerminalJob(job)) {
      return job;
    }

    await delay(options.pollIntervalMs, options.signal);
  }

  throw new Error("Save is still running. Check the local receiver.");
}

async function fetchReceiver(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetcher(input, init);
  } catch {
    throwIfAborted(init?.signal);
    throw new Error(
      "Local receiver is not running. Start it with npm run dew, then retry."
    );
  }
}

async function parseJobResponse(response: Response): Promise<ReceiverDownloadJob> {
  const body = (await response.json().catch(() => ({}))) as ReceiverJobResponse;

  if (!response.ok) {
    throw new Error(body.error || "Local receiver rejected the save request.");
  }

  if (!body.job) {
    throw new Error("Local receiver returned an invalid job response.");
  }

  return body.job;
}

function isTerminalJob(job: ReceiverDownloadJob): boolean {
  return job.status === "completed" || job.status === "failed";
}

function delay(
  milliseconds: number,
  signal: AbortSignal | undefined
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(resolve, milliseconds);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        resolve();
      },
      { once: true }
    );
  });
}

function throwIfAborted(signal: AbortSignal | null | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("Save was cancelled.", "AbortError");
  }
}
