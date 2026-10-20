import {
  deleteJobFolder,
  isSafeExportJobId,
  readManifest,
  writeManifest,
  type LockerManifest,
} from "@/server/office-blobs";
import type { OfficePinsPayload, PinDescriptionUpdate } from "@/lib/office-pins";
import {
  readExportJobPins as readBlobsPins,
  updateExportJobPinDescriptions as updateBlobsPins,
} from "@/server/office-pins";

/** Human-facing job label for office list / header (keeps spaces; strips path-illegal chars). */
export function sanitizeOfficeFolderName(raw: string): string {
  return raw
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .trim();
}

/** Delete every object under the Blobs job folder. */
export async function deleteExportJobFolder(jobId: string): Promise<{ deleted: number }> {
  if (!isSafeExportJobId(jobId)) {
    throw new Error("Invalid job id.");
  }
  return deleteJobFolder(jobId);
}

/** Update Blobs manifest syncedFrom. */
export async function updateExportJobFrom(
  jobId: string,
  syncedFrom: string,
): Promise<{ syncedFrom: string }> {
  if (!isSafeExportJobId(jobId)) {
    throw new Error("Invalid job id.");
  }
  const label = syncedFrom.trim().slice(0, 80);
  if (!label) {
    throw new Error("From label required.");
  }

  const manifest: LockerManifest = (await readManifest(jobId)) || {
    version: 1,
    folderName: jobId,
    files: [],
    createdAt: new Date().toISOString(),
  };

  manifest.syncedFrom = label;
  manifest.deviceName = label;
  if (!manifest.version) manifest.version = 1;
  await writeManifest(jobId, manifest);
  return { syncedFrom: label };
}

/** Update Blobs manifest folderName. */
export async function updateExportJobFolderName(
  jobId: string,
  folderName: string,
): Promise<{ folderName: string; officeNameEditedAt: string }> {
  if (!isSafeExportJobId(jobId)) {
    throw new Error("Invalid job id.");
  }
  const label = sanitizeOfficeFolderName(folderName);
  if (!label) {
    throw new Error("Job name required.");
  }

  const manifest: LockerManifest = (await readManifest(jobId)) || {
    version: 1,
    folderName: jobId,
    files: [],
    createdAt: new Date().toISOString(),
  };

  const nowIso = new Date().toISOString();
  manifest.folderName = label;
  manifest.officeNameEditedAt = nowIso;
  if (!manifest.version) manifest.version = 1;
  await writeManifest(jobId, manifest);
  return { folderName: label, officeNameEditedAt: nowIso };
}

export async function readExportJobPins(jobId: string): Promise<OfficePinsPayload> {
  return readBlobsPins(jobId);
}

export async function updateExportJobPins(
  jobId: string,
  updates: PinDescriptionUpdate[],
): Promise<OfficePinsPayload> {
  return updateBlobsPins(jobId, updates);
}
