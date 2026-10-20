/**
 * Every job lives in the site-wide Netlify Blobs locker.
 * (Kept as a type so list/download payloads stay explicit about where files came from.)
 */
export type OfficeJobSource = "blobs";
