// Hands the browser a one-off token to upload an Artwork straight into the
// private Blob store. The file itself never passes through this function —
// a Vercel Function body tops out at 4.5 MB, and an Artwork can be 25.

import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  ARTWORK_CONTENT_TYPES,
  MAX_ARTWORK_BYTES,
  artworkStoreToken,
} from "@/lib/artwork-store";
import { ARTWORK_FOLDER } from "@/lib/custom-request";

export async function POST(request: Request) {
  const token = artworkStoreToken();
  if (!token) {
    console.error("[custom-belt/upload] CUSTOM_BELT_BLOB_READ_WRITE_TOKEN is not set");
    return NextResponse.json({ error: "Завантаження тимчасово недоступне" }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token,
      // No rate limit here, deliberately (Hobby has no WAF rules): the token is
      // good for one image of at most 25 MB, in one folder, and a store that
      // starts filling up with junk shows on the Blob dashboard.
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(ARTWORK_FOLDER) || pathname.includes("..")) {
          throw new Error("Unexpected pathname");
        }
        return {
          allowedContentTypes: ARTWORK_CONTENT_TYPES,
          maximumSizeInBytes: MAX_ARTWORK_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[custom-belt/upload]", message);
    return NextResponse.json({ error: "Не вдалося почати завантаження" }, { status: 400 });
  }
}
