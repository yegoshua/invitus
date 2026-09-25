// Where Artwork lives between «Надіслати» and the Orders chat. Server-only.
//
// A *private* Blob store, and a separate one from the public store the site's
// videos come from: privacy is a property of the store, not of a file, and a
// customer's logo or photo must not sit behind a URL that works for anyone who
// is sent it.
//
// Env (server-only, .env.local and Vercel):
//   CUSTOM_BELT_BLOB_READ_WRITE_TOKEN  read-write token of the private store.
//     Named explicitly rather than left to the SDK's default, because the
//     default — BLOB_READ_WRITE_TOKEN — is already the public video store's.

import { get, head } from "@vercel/blob";
import { ARTWORK_FOLDER } from "./custom-request.ts";

export const ARTWORK_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_ARTWORK_BYTES = 25 * 1024 * 1024;

/** The private store's token, or null — callers turn that into a clear failure. */
export function artworkStoreToken(): string | null {
  return process.env.CUSTOM_BELT_BLOB_READ_WRITE_TOKEN || null;
}

/** Whether `pathname` is one of ours and was actually uploaded. */
export async function artworkExists(pathname: string): Promise<boolean> {
  const token = artworkStoreToken();
  if (!token || !pathname.startsWith(ARTWORK_FOLDER)) return false;
  try {
    await head(pathname, { token });
    return true;
  } catch {
    return false;
  }
}

/** The Artwork's bytes, or null when it cannot be read. Never throws. */
export async function readArtwork(pathname: string): Promise<Blob | null> {
  const token = artworkStoreToken();
  if (!token) return null;
  try {
    const result = await get(pathname, { access: "private", token });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return await new Response(result.stream, {
      headers: { "Content-Type": result.blob.contentType },
    }).blob();
  } catch (err) {
    console.error("[artwork-store] read failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
