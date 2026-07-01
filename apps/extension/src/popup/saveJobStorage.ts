import type { ReceiverDownloadProgress, ReceiverDownloadJobStatus } from "./receiverClient";

const SAVE_JOBS_KEY_PREFIX = "save-jobs:";

export type PersistedSaveStatus =
  | ReceiverDownloadJobStatus
  | "saving"
  | "unavailable";

export type PersistedSaveState = {
  status: PersistedSaveStatus;
  message: string;
  outputPath?: string;
  progress?: ReceiverDownloadProgress;
};

export type PersistedSaveJob = {
  jobId: string;
  mediaId: string;
  saveState: PersistedSaveState;
  updatedAt: string;
};

export function getSaveJobsStorageKey(tabId: number): string {
  return `${SAVE_JOBS_KEY_PREFIX}${tabId}`;
}

export async function readSaveJobs(
  tabId: number
): Promise<Record<string, PersistedSaveJob>> {
  const key = getSaveJobsStorageKey(tabId);
  const result = await chrome.storage.session.get(key);

  return isPersistedSaveJobMap(result[key]) ? result[key] : {};
}

export async function writeSaveJob(
  tabId: number,
  saveJob: PersistedSaveJob
): Promise<void> {
  const key = getSaveJobsStorageKey(tabId);
  const saveJobs = await readSaveJobs(tabId);

  await chrome.storage.session.set({
    [key]: {
      ...saveJobs,
      [saveJob.mediaId]: saveJob
    }
  });
}

export async function removeSaveJobs(tabId: number): Promise<void> {
  await chrome.storage.session.remove(getSaveJobsStorageKey(tabId));
}

function isPersistedSaveJobMap(
  value: unknown
): value is Record<string, PersistedSaveJob> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(isPersistedSaveJob)
  );
}

function isPersistedSaveJob(value: unknown): value is PersistedSaveJob {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PersistedSaveJob>;

  return (
    typeof candidate.jobId === "string" &&
    typeof candidate.mediaId === "string" &&
    typeof candidate.updatedAt === "string" &&
    isPersistedSaveState(candidate.saveState)
  );
}

function isPersistedSaveState(value: unknown): value is PersistedSaveState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PersistedSaveState>;

  return typeof candidate.status === "string" && typeof candidate.message === "string";
}
