import type { OfficeJobSource } from "@/server/office-host";
import {
  getDownloadMonthBytes,
  listJobFolders,
  LOCKER_BUDGET_BYTES,
  sumLockerBytes,
} from "@/server/office-blobs";

export type OfficeJobFolder = {
  /** Top-level folder name (job id used by /office File Explorer). */
  id: string;
  /** Human-readable site / project name from export manifest (`folderName`). */
  displayName: string | null;
  fileCount: number;
  totalBytes: number;
  manifestFileCount: number | null;
  storageObjectCount: number;
  syncIncomplete: boolean;
  /** Last synced (`manifest.syncedAt`), ISO string when present. */
  syncedAt: string | null;
  /** Device nickname from Sync (`syncedFrom` / `deviceName`). */
  syncedFrom: string | null;
  /** Which locker holds this job — drives Open / Download / Delete routing. */
  source?: OfficeJobSource;
};

export type OfficeLockerStats = {
  usedBytes: number;
  budgetBytes: number;
  downloadedMonthBytes: number;
  downloadedMonthKey: string;
};

/** www always has Netlify Blobs. */
export function officeLockerConfigured(): boolean {
  return true;
}

function sortJobs(jobs: OfficeJobFolder[]): void {
  jobs.sort((a, b) => {
    const aTime = a.syncedAt ? Date.parse(a.syncedAt) : 0;
    const bTime = b.syncedAt ? Date.parse(b.syncedAt) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return (a.displayName || a.id).localeCompare(b.displayName || b.id);
  });
}

/** Lists job folders from the site-wide Netlify Blobs locker. */
export async function fetchExportJobListFromBlobs(): Promise<{
  ok: true;
  jobs: OfficeJobFolder[];
  locker: OfficeLockerStats;
}> {
  const raw = await listJobFolders();
  const jobs: OfficeJobFolder[] = (raw as Array<Omit<OfficeJobFolder, "source">>).map((j) => ({
    ...j,
    source: "blobs" as const,
  }));
  sortJobs(jobs);
  const usedBytes = await sumLockerBytes();
  const dl = await getDownloadMonthBytes();
  return {
    ok: true,
    jobs,
    locker: {
      usedBytes,
      budgetBytes: LOCKER_BUDGET_BYTES,
      downloadedMonthBytes: dl.bytes,
      downloadedMonthKey: dl.month,
    },
  };
}

/** Job list from the Netlify Blobs locker. Empty is correct until a phone Syncs new work. */
export async function fetchMergedOfficeJobList(): Promise<{
  listAvailable: boolean;
  jobs: OfficeJobFolder[];
  locker: OfficeLockerStats | null;
}> {
  try {
    const blobs = await fetchExportJobListFromBlobs();
    return { listAvailable: true, jobs: blobs.jobs, locker: blobs.locker };
  } catch (e) {
    console.error("[officeListJobs] blobs list failed", e);
    return { listAvailable: false, jobs: [], locker: null };
  }
}
