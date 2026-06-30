export type {
  DetectedMedia,
  DetectedMediaBase,
  DetectionContext,
  DetectionSource,
  DetectionStatus,
  MediaCandidate,
  MediaDetectionSnapshot,
  MediaKind,
  MediaProvenance,
  UnsupportedMedia,
  UnsupportedReason
} from "./media";

export { DETECTION_MODEL_VERSION } from "./media";
export {
  getMediaSnapshotStorageKey,
  readMediaDetectionSnapshot,
  removeMediaDetectionSnapshot,
  writeMediaDetectionSnapshot
} from "./mediaSnapshotStorage";
export {
  isPageMediaDetectedMessage,
  PAGE_MEDIA_DETECTED_MESSAGE,
  type ExtensionMessage,
  type PageMediaDetectedMessage
} from "./messages";
