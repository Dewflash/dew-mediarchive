import type { DetectedMedia, MediaDetectionSnapshot } from "../shared";
import {
  readMediaDetectionSnapshot,
  removeMediaDetectionSnapshot,
  writeMediaDetectionSnapshot
} from "../shared";

const tabWriteQueues = new Map<number, Promise<unknown>>();

export async function readTabSnapshot(
  tabId: number
): Promise<MediaDetectionSnapshot | undefined> {
  return readMediaDetectionSnapshot(tabId);
}

export async function appendDetectedMedia(
  tabId: number,
  pageUrl: string | undefined,
  pageTitle: string | undefined,
  media: DetectedMedia
): Promise<MediaDetectionSnapshot> {
  return enqueueTabWrite(tabId, async () => {
    return appendDetectedMediaNow(tabId, pageUrl, pageTitle, media);
  });
}

export async function clearTabSnapshot(tabId: number): Promise<void> {
  await enqueueTabWrite(tabId, async () => {
    await removeMediaDetectionSnapshot(tabId);
  });
}

export async function updateBadgeForSnapshot(
  tabId: number,
  snapshot: MediaDetectionSnapshot | undefined
): Promise<void> {
  const candidateCount =
    snapshot?.candidates.filter((candidate) => candidate.status === "candidate")
      .length ?? 0;

  try {
    await chrome.action.setBadgeText({
      tabId,
      text: candidateCount > 0 ? String(candidateCount) : ""
    });

    await chrome.action.setBadgeBackgroundColor({
      tabId,
      color: "#2563EB"
    });
  } catch (error) {
    if (isMissingTabError(error)) {
      return;
    }

    throw error;
  }
}

async function appendDetectedMediaNow(
  tabId: number,
  pageUrl: string | undefined,
  pageTitle: string | undefined,
  media: DetectedMedia
): Promise<MediaDetectionSnapshot> {
  const previousSnapshot = await readTabSnapshot(tabId);
  const existingCandidates = previousSnapshot?.candidates ?? [];
  const nextCandidates = upsertById(existingCandidates, media);
  const now = new Date().toISOString();

  const nextSnapshot: MediaDetectionSnapshot = {
    tabId,
    pageUrl,
    pageTitle,
    candidates: nextCandidates,
    updatedAt: now
  };

  await writeMediaDetectionSnapshot(nextSnapshot);

  return nextSnapshot;
}

function enqueueTabWrite<T>(
  tabId: number,
  operation: () => Promise<T>
): Promise<T> {
  const previousWrite = tabWriteQueues.get(tabId) ?? Promise.resolve();
  const nextWrite = previousWrite.catch(() => undefined).then(operation);

  tabWriteQueues.set(
    tabId,
    nextWrite.finally(() => {
      if (tabWriteQueues.get(tabId) === nextWrite) {
        tabWriteQueues.delete(tabId);
      }
    })
  );

  return nextWrite;
}

function upsertById(
  existingCandidates: DetectedMedia[],
  nextCandidate: DetectedMedia
): DetectedMedia[] {
  const existingIndex = findExistingMediaIndex(existingCandidates, nextCandidate);

  if (existingIndex < 0) {
    return [...existingCandidates, nextCandidate];
  }

  if (!shouldReplaceMedia(existingCandidates[existingIndex], nextCandidate)) {
    return existingCandidates;
  }

  const nextCandidates = [...existingCandidates];
  nextCandidates[existingIndex] = nextCandidate;
  return nextCandidates;
}

function findExistingMediaIndex(
  existingCandidates: DetectedMedia[],
  nextCandidate: DetectedMedia
): number {
  const exactIndex = existingCandidates.findIndex(
    (candidate) => candidate.id === nextCandidate.id
  );

  if (exactIndex >= 0 || nextCandidate.status !== "candidate") {
    return exactIndex;
  }

  const nextStreamGroupKey = nextCandidate.streamGroupKey;

  if (!nextStreamGroupKey) {
    return -1;
  }

  return existingCandidates.findIndex(
    (candidate) =>
      candidate.status === "candidate" &&
      candidate.streamGroupKey === nextStreamGroupKey &&
      candidate.kind === nextCandidate.kind
  );
}

function shouldReplaceMedia(
  existingCandidate: DetectedMedia,
  nextCandidate: DetectedMedia
): boolean {
  if (
    existingCandidate.status !== "candidate" ||
    nextCandidate.status !== "candidate"
  ) {
    return true;
  }

  return getStreamCandidatePriority(nextCandidate) >= getStreamCandidatePriority(
    existingCandidate
  );
}

function getStreamCandidatePriority(candidate: DetectedMedia): number {
  if (candidate.status !== "candidate") {
    return 0;
  }

  if (candidate.streamRole === "master-playlist") {
    return 10_000;
  }

  if (candidate.streamRole === "variant-playlist") {
    return 100 + getQualityHeight(candidate.quality);
  }

  return 1;
}

function getQualityHeight(quality: string | undefined): number {
  if (!quality) {
    return 0;
  }

  const match = /^(\d{3,4})p$/.exec(quality);
  return match ? Number(match[1]) : 0;
}

function isMissingTabError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /No tab with id:/i.test(error.message)
  );
}
