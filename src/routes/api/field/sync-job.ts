import { createFileRoute } from "@tanstack/react-router";
import {
  deleteJobFolder,
  isSafeExportJobId,
  listJobFiles,
  plainCapMessage,
  readManifest,
  verifyFieldKey,
} from "@/server/office-blobs";

/**
 * Field Sync into an existing job folder.
 *   GET  ?jobId=…  → { exists, deskEdited, editedAt } (was this job edited at the desk?)
 *   POST ?jobId=…  → clears the job folder so the phone can upload a fresh copy
 * Header: X-PGG-Field-Key
 */
export const Route = createFileRoute("/api/field/sync-job")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!verifyFieldKey(request.headers.get("x-pgg-field-key"))) {
            return Response.json(
              { error: plainCapMessage("field-key") },
              { status: 401, headers: { "Cache-Control": "no-store" } },
            );
          }
          const jobId = new URL(request.url).searchParams.get("jobId")?.trim() || "";
          if (!isSafeExportJobId(jobId)) {
            return Response.json({ error: "That job id looks wrong." }, { status: 400 });
          }
          const manifest = await readManifest(jobId);
          const files = manifest ? [] : await listJobFiles(jobId);
          const exists = Boolean(manifest) || files.length > 0;
          const notesAt = manifest?.officeNotesEditedAt?.trim() || null;
          const nameAt = manifest?.officeNameEditedAt?.trim() || null;
          return Response.json(
            {
              exists,
              deskEdited: Boolean(notesAt || nameAt),
              editedAt: notesAt || nameAt,
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("[sync-job GET]", error);
          return Response.json(
            { error: "Couldn’t check the office copy. Try Sync again." },
            { status: 500, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          if (!verifyFieldKey(request.headers.get("x-pgg-field-key"))) {
            return Response.json(
              { error: plainCapMessage("field-key") },
              { status: 401, headers: { "Cache-Control": "no-store" } },
            );
          }
          const jobId = new URL(request.url).searchParams.get("jobId")?.trim() || "";
          if (!isSafeExportJobId(jobId)) {
            return Response.json({ error: "That job id looks wrong." }, { status: 400 });
          }
          const result = await deleteJobFolder(jobId);
          return Response.json({ ok: true, deleted: result.deleted }, {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (error) {
          console.error("[sync-job POST]", error);
          return Response.json(
            { error: "Couldn’t clear the old office copy. Try Sync again." },
            { status: 500, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
