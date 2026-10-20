import {
  isSafeExportJobId,
  isSafeExportRelativePath,
  listJobFiles,
  readManifest,
  type LockerManifest,
} from "@/server/office-blobs";
import type { OfficeJobSource } from "@/server/office-host";

export { isSafeExportJobId, isSafeExportRelativePath };

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type OfficeDownloadFile = {
  /** Storage path relative to the job folder (used for lazy chunk download). */
  path: string;
  /** Human label (zip part name or zipPath from manifest). */
  label: string;
  sizeBytes: number | null;
  /**
   * Same-origin chunk marker (Blobs).
   * Null on list until sign-on-click.
   */
  signedUrl: string | null;
  totalChunks?: number;
};

export type OfficeJobDownloadPayload = {
  jobId: string;
  kind: "manifest" | "zip-parts" | "empty";
  folderName: string | null;
  uploadKind: string | null;
  syncedAt: string | null;
  syncedFrom: string | null;
  getPagePath: string;
  signedUrlTtlSeconds: number;
  files: OfficeDownloadFile[];
  manifestExpectedFiles: number | null;
  storageObjectCount: number;
  syncIncomplete: boolean;
  missingManifestPaths: number;
  /** Which locker served this job. */
  source: OfficeJobSource;
};

/** www always has Netlify Blobs. */
export function officeDownloadStorageConfigured(): boolean {
  return true;
}

function manifestSyncedAt(manifest: LockerManifest | null): string | null {
  const raw = manifest?.syncedAt?.trim();
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? new Date(t).toISOString() : raw;
}

function manifestSyncedFrom(manifest: LockerManifest | null): string | null {
  return manifest?.syncedFrom?.trim() || manifest?.deviceName?.trim() || null;
}

/** Marker URL — client fetches /api/office/file-chunk with session. */
export function officeFileAccessMarker(jobId: string, relativePath: string): string {
  return (
    `/api/office/file-chunk?jobId=${encodeURIComponent(jobId)}` +
    `&path=${encodeURIComponent(relativePath)}`
  );
}

export function isBlobsChunkMarker(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("/api/office/file-chunk") || url.includes("/api/office/file-chunk?");
}

/**
 * Lists files for Open from Netlify Blobs — no third-party signed URLs.
 */
export async function buildOfficeJobDownloadFromBlobs(
  jobId: string,
): Promise<OfficeJobDownloadPayload> {
  const base = {
    jobId,
    getPagePath: `/get?job=${encodeURIComponent(jobId)}`,
    signedUrlTtlSeconds: SIGNED_URL_TTL_SECONDS,
    files: [] as OfficeDownloadFile[],
    manifestExpectedFiles: null as number | null,
    storageObjectCount: 0,
    syncIncomplete: false,
    missingManifestPaths: 0,
    syncedAt: null as string | null,
    syncedFrom: null as string | null,
    source: "blobs" as const,
  };

  if (!isSafeExportJobId(jobId)) {
    return { ...base, kind: "empty", folderName: null, uploadKind: null };
  }

  const stored = await listJobFiles(jobId);
  const storedPathSet = new Set(stored.map((o) => o.relativePath));
  const sizeByPath = new Map(stored.map((o) => [o.relativePath, o.sizeBytes]));
  const chunksByPath = new Map(stored.map((o) => [o.relativePath, o.totalChunks]));
  base.storageObjectCount = stored.length;

  const manifest = await readManifest(jobId);
  base.syncedAt = manifestSyncedAt(manifest);
  base.syncedFrom = manifestSyncedFrom(manifest);

  if (manifest?.files?.length) {
    const folderName = manifest.folderName?.trim() || null;
    const uploadKind = manifest.uploadKind?.trim() || null;
    const files: OfficeDownloadFile[] = [];
    let missingManifestPaths = 0;
    for (const entry of manifest.files) {
      const path = entry.path?.trim();
      const label = entry.zipPath?.trim() || path;
      if (!path || !label) continue;
      if (!storedPathSet.has(path)) {
        missingManifestPaths++;
        continue;
      }
      files.push({
        path,
        label,
        sizeBytes: sizeByPath.get(path) ?? null,
        signedUrl: null,
        totalChunks: chunksByPath.get(path) ?? 1,
      });
    }
    files.sort((a, b) => a.label.localeCompare(b.label));
    const manifestExpectedFiles = manifest.files.length;
    const syncIncomplete = missingManifestPaths > 0 || manifestExpectedFiles > stored.length;
    return {
      ...base,
      kind: files.length ? "manifest" : "empty",
      folderName,
      uploadKind,
      files,
      manifestExpectedFiles,
      syncIncomplete,
      missingManifestPaths,
    };
  }

  const files: OfficeDownloadFile[] = stored
    .filter((o) => o.relativePath !== "manifest.json")
    .map((o) => ({
      path: o.relativePath,
      label: o.relativePath.replace(/^files\//, ""),
      sizeBytes: o.sizeBytes,
      signedUrl: null,
      totalChunks: o.totalChunks,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    ...base,
    kind: files.length ? "manifest" : "empty",
    folderName: null,
    uploadKind: null,
    files,
    manifestExpectedFiles: null,
    syncIncomplete: false,
    missingManifestPaths: 0,
  };
}

/** @deprecated Prefer buildOfficeJobDownloadFromBlobs / resolveOfficeJobDownload. */
export async function buildOfficeJobDownload(jobId: string): Promise<OfficeJobDownloadPayload> {
  return resolveOfficeJobDownload(jobId);
}

/** Open/Download payload from the Netlify Blobs locker. */
export async function resolveOfficeJobDownload(
  jobId: string,
  _preferredSource?: OfficeJobSource | null,
): Promise<OfficeJobDownloadPayload> {
  try {
    return await buildOfficeJobDownloadFromBlobs(jobId);
  } catch (e) {
    console.error("[office-download] blobs resolve failed", jobId, e);
    return emptyPayload(jobId, "blobs");
  }
}

function emptyPayload(jobId: string, source: OfficeJobSource): OfficeJobDownloadPayload {
  return {
    jobId,
    kind: "empty",
    folderName: null,
    uploadKind: null,
    syncedAt: null,
    syncedFrom: null,
    getPagePath: `/get?job=${encodeURIComponent(jobId)}`,
    signedUrlTtlSeconds: SIGNED_URL_TTL_SECONDS,
    files: [],
    manifestExpectedFiles: null,
    storageObjectCount: 0,
    syncIncomplete: false,
    missingManifestPaths: 0,
    source,
  };
}

export type OfficeSignResult = {
  signedUrl: string;
  expiresIn: number;
  totalChunks: number;
  sizeBytes: number;
  /** Same-origin Blobs pieces. */
  access: "chunk";
  source: OfficeJobSource;
};

/** Desk “sign”: returns the Blobs chunk marker for one file (same-origin pieces). */
export async function signOfficeExportFile(
  jobId: string,
  relativePath: string,
  _preferredSource?: OfficeJobSource | null,
): Promise<OfficeSignResult | null> {
  if (!isSafeExportJobId(jobId) || !isSafeExportRelativePath(relativePath)) return null;
  if (relativePath === "manifest.json") return null;

  try {
    const files = await listJobFiles(jobId);
    const hit = files.find((f) => f.relativePath === relativePath);
    if (!hit) return null;
    return {
      signedUrl: officeFileAccessMarker(jobId, relativePath),
      expiresIn: SIGNED_URL_TTL_SECONDS,
      totalChunks: hit.totalChunks,
      sizeBytes: hit.sizeBytes,
      access: "chunk",
      source: "blobs",
    };
  } catch {
    return null;
  }
}
