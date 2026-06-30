import type { DetectedMedia, MediaDetectionSnapshot } from "../shared";

const SNAPSHOT_KEY_PREFIX = "media-snapshot:";
const tabWriteQueues = new Map<number, Promise<unknown>>();

export async function readTabSnapshot(
  tabId: number
): Promise<MediaDetectionSnapshot | undefined> {
  const key = getSnapshotKey(tabId);
  const result = await chrome.storage.session.get(key);

  return result[key] as MediaDetectionSnapshot | undefined;
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
    await chrome.storage.session.remove(getSnapshotKey(tabId));
  });
}

export async function updateBadgeForSnapshot(
  tabId: number,
  snapshot: MediaDetectionSnapshot | undefined
): Promise<void> {
  const candidateCount =
    snapshot?.candidates.filter((candidate) => candidate.status === "candidate")
      .length ?? 0;

  await chrome.action.setBadgeText({
    tabId,
    text: candidateCount > 0 ? String(candidateCount) : ""
  });

  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: "#2563EB"
  });
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

  await chrome.storage.session.set({
    [getSnapshotKey(tabId)]: nextSnapshot
  });

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
  const existingIndex = existingCandidates.findIndex(
    (candidate) => candidate.id === nextCandidate.id
  );

  if (existingIndex < 0) {
    return [...existingCandidates, nextCandidate];
  }

  const nextCandidates = [...existingCandidates];
  nextCandidates[existingIndex] = nextCandidate;
  return nextCandidates;
}

function getSnapshotKey(tabId: number): string {
  return `${SNAPSHOT_KEY_PREFIX}${tabId}`;
}
