// What a Custom request says in the Orders chat. Pure formatting plus a thin
// sender, split the same way as lib/order-notifications.ts so the wording is
// testable without a bot token — hence relative imports and no `@/` alias.

import { printQuality } from "./belt-design.ts";
import { CUSTOM_BASE } from "./custom-base.ts";
import { formatPriceWithCurrency } from "./format.ts";
import { UNKNOWN_SIZE, type CustomRequest } from "./custom-request.ts";
import { sizeDisplayText } from "./size-display.ts";
import { escapeHtml, sendTelegramFile, sendTelegramMessage } from "./telegram.ts";

function cm(value: number): string {
  return `${Math.round(value * 10) / 10} см`;
}

/**
 * The message the team reads. Everything the customer typed goes through
 * escapeHtml — a name is a place a stranger can put a link.
 *
 * The placement line is there so the Belt design can be rebuilt at print size
 * from the original Artwork; the preview photo is only for the eye.
 */
export function formatCustomRequest(request: CustomRequest): string {
  const { artwork, placement } = request;
  const quality = printQuality(artwork, placement);
  const size =
    request.size === UNKNOWN_SIZE
      ? "не знає — підкажіть"
      : sizeDisplayText(request.size, request.sizeLabel ?? request.size);

  const lines = [
    "🎨 <b>Запит на кастомний пояс</b>",
    "",
    `👤 ${escapeHtml(request.name)}`,
    `📞 ${escapeHtml(request.phone)}`,
    `📏 Розмір: ${escapeHtml(size)}`,
  ];
  if (request.comment) lines.push(`💬 Коментар: ${escapeHtml(request.comment)}`);

  lines.push(
    "",
    "<b>Розміщення на смузі 100 × 10 см</b>",
    `Зображення ${artwork.width}×${artwork.height} px, ${cm(placement.width)} завширшки`,
    `центр — ${cm(placement.centerX)} уздовж, ${cm(placement.centerY)} від верхнього краю`,
    `фон ${placement.background}`,
    `${quality.verdict === "low" ? "⚠️ " : ""}Якість друку: ${Math.round(quality.dpi)} DPI`,
    "",
    `Ціна «від ${formatPriceWithCurrency(CUSTOM_BASE.fromPrice)}» — узгодити з покупцем.`,
  );

  return lines.join("\n");
}

/**
 * Posts a Custom request to the Orders chat as three messages threaded on the
 * first: the text, the preview as a photo to look at, and the Artwork as a
 * document — a photo is recompressed by Telegram, and the workshop prints from
 * this file. True only if all three arrived; never throws.
 */
export async function deliverCustomRequest(
  request: CustomRequest,
  preview: Blob,
  artwork: Blob | null,
): Promise<boolean> {
  const text = await sendTelegramMessage(formatCustomRequest(request));
  if (!text) return false;
  const replyTo = text.message_id;

  const photo = await sendTelegramFile("photo", preview, "belt-design.jpg", {
    caption: "Як покупець розмістив зображення (превʼю, не для друку)",
    replyTo,
  });
  const document = artwork
    ? await sendTelegramFile("document", artwork, request.artwork.fileName || "artwork", {
        caption: "Оригінал зображення — з нього друкувати",
        replyTo,
      })
    : null;

  return Boolean(photo && document);
}
