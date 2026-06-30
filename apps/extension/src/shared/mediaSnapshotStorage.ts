import type { MediaDetectionSnapshot } from "./media";

const SNAPSHOT_KEY_PREFIX = "media-snapshot:";

export function getMediaSnapshotStorageKey(tabId: number): string {
  return `${SNAPSHOT_KEY_PREFIX}${tabId}`;
}

export async function readMediaDetectionSnapshot(
  tabId: number
): Promise<MediaDetectionSnapshot | undefined> {
  const key = getMediaSnapshotStorageKey(tabId);
  const result = await chrome.storage.session.get(key);

  return result[key] as MediaDetectionSnapshot | undefined;
}

export async function writeMediaDetectionSnapshot(
  snapshot: MediaDetectionSnapshot
): Promise<void> {
  await chrome.storage.session.set({
    [getMediaSnapshotStorageKey(snapshot.tabId)]: snapshot
  });
}

export async function removeMediaDetectionSnapshot(tabId: number): Promise<void> {
  await chrome.storage.session.remove(getMediaSnapshotStorageKey(tabId));
}

