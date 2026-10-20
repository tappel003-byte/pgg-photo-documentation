import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hasValidOfficeSession } from "@/server/office-session";
import { isSafeExportJobId } from "@/server/office-download";
import {
  deleteExportJobFolder,
  readExportJobPins,
  updateExportJobFolderName,
  updateExportJobFrom,
  updateExportJobPins,
} from "@/server/office-mutate";
import type { OfficePinsPayload } from "@/lib/office-pins";

/** Kept for older callers; every job lives in the Netlify Blobs locker. */
const sourceSchema = z.enum(["blobs"]).optional().nullable();

export const officeDeleteJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().min(1).max(200),
      source: sourceSchema,
    }),
  )
  .handler(async ({ data }): Promise<{ deleted: number }> => {
    if (!hasValidOfficeSession()) {
      throw new Error("Sign in required.");
    }
    if (!isSafeExportJobId(data.jobId)) {
      throw new Error("Invalid job id.");
    }

    const result = await deleteExportJobFolder(data.jobId.trim());
    return { deleted: result.deleted };
  });

export const officeSetJobFrom = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().min(1).max(200),
      syncedFrom: z.string().min(1).max(80),
      source: sourceSchema,
    }),
  )
  .handler(async ({ data }): Promise<{ syncedFrom: string }> => {
    if (!hasValidOfficeSession()) {
      throw new Error("Sign in required.");
    }
    if (!isSafeExportJobId(data.jobId)) {
      throw new Error("Invalid job id.");
    }

    const result = await updateExportJobFrom(data.jobId.trim(), data.syncedFrom.trim());
    return { syncedFrom: result.syncedFrom };
  });

export const officeSetJobName = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().min(1).max(200),
      folderName: z.string().min(1).max(120),
      source: sourceSchema,
    }),
  )
  .handler(async ({ data }): Promise<{ folderName: string }> => {
    if (!hasValidOfficeSession()) {
      throw new Error("Sign in required.");
    }
    if (!isSafeExportJobId(data.jobId)) {
      throw new Error("Invalid job id.");
    }

    const result = await updateExportJobFolderName(data.jobId.trim(), data.folderName.trim());
    return { folderName: result.folderName };
  });

export const officeGetJobPins = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().min(1).max(200),
      source: sourceSchema,
    }),
  )
  .handler(async ({ data }): Promise<OfficePinsPayload> => {
    if (!hasValidOfficeSession()) {
      throw new Error("Sign in required.");
    }
    if (!isSafeExportJobId(data.jobId)) {
      throw new Error("Invalid job id.");
    }

    return readExportJobPins(data.jobId.trim());
  });

export const officeUpdateJobPins = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().min(1).max(200),
      source: sourceSchema,
      updates: z
        .array(
          z.object({
            pinId: z.string().max(200).optional(),
            pinNum: z.string().max(40).optional(),
            description: z.string().max(8000),
          }),
        )
        .min(1)
        .max(500),
    }),
  )
  .handler(async ({ data }): Promise<OfficePinsPayload> => {
    if (!hasValidOfficeSession()) {
      throw new Error("Sign in required.");
    }
    if (!isSafeExportJobId(data.jobId)) {
      throw new Error("Invalid job id.");
    }

    return updateExportJobPins(data.jobId.trim(), data.updates);
  });
