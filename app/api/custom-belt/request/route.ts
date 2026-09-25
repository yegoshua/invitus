// Takes a Custom request and gets it to the Orders chat.
//
// The customer is answered as soon as the request is known to be whole — the
// fields parse and the Artwork is really in the store. Posting to Telegram
// happens in after(): three uploads, one of them up to 25 MB, are not
// something to hold a customer's spinner on. If that later fails, nobody is
// told «не вдалося» who can do anything about it, so the team is alerted
// instead — the request is real, and the customer is waiting for a call.
//
// Nothing here touches KeyCRM or the Finance chat: a Custom request is not an
// Order and carries no money (CONTEXT.md).
//
// No rate limit, like the upload token and for the same reason (Hobby has no
// WAF rules, and a limit needs shared state this project does not keep). The
// worst a script can do is re-post Artwork already in the store to the team's
// own chat; if it happens, the answer is rotating the store token.

import { after, NextResponse } from "next/server";
import { reportFailure } from "@/lib/alerts";
import { artworkExists, readArtwork } from "@/lib/artwork-store";
import { customRequestSchema } from "@/lib/custom-request";
import { deliverCustomRequest } from "@/lib/custom-request-notification";

/**
 * Room for after(): reading a 25 MB Artwork and three Telegram uploads, each
 * allowed up to a minute. Cut short, the send dies half-way and the alert
 * that would have said so dies with it.
 */
export const maxDuration = 300;

/** The preview is a small JPEG the browser renders from the Belt design. */
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("request") ?? ""));
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const parsed = customRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Перевір поля форми" },
      { status: 400 }
    );
  }

  const preview = form.get("preview");
  if (!(preview instanceof Blob) || preview.type !== "image/jpeg" || preview.size > MAX_PREVIEW_BYTES) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const data = parsed.data;
  if (!(await artworkExists(data.artwork.pathname))) {
    return NextResponse.json(
      { error: "Зображення не завантажилось. Спробуй надіслати ще раз." },
      { status: 400 }
    );
  }

  after(async () => {
    const artwork = await readArtwork(data.artwork.pathname);
    const delivered = await deliverCustomRequest(data, preview, artwork);
    if (!delivered) {
      await reportFailure({
        // Per request, not one shared scope: the alert throttle would otherwise
        // swallow a second failed request inside five minutes, and this alert
        // is the only place that customer's phone number appears.
        scope: `custom-request.deliver:${data.artwork.pathname}`,
        title: "Запит на кастомний пояс не дійшов у групу повністю",
        context: {
          "Ім'я": data.name,
          "Телефон": data.phone,
          "Файл у Blob": data.artwork.pathname,
        },
        action: "Зателефонуй покупцю; оригінал зображення лежить у приватному Blob-сховищі.",
      });
    }
  });

  return NextResponse.json({ ok: true });
}
