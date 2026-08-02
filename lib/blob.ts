/**
 * Videos live on Vercel Blob rather than in `public/`: they are content that
 * gets recut without a code change, and a video committed to the repo stays in
 * git history at full weight forever.
 *
 * One origin, named once, because the homepage `preconnect`s to it — a hint
 * pointing at an origin nothing actually fetches from is worse than no hint.
 */
export const BLOB_ORIGIN =
  "https://8azpg4yt0gjxqxuj.public.blob.vercel-storage.com";

export function blobUrl(path: string): string {
  return `${BLOB_ORIGIN}/${path}`;
}
