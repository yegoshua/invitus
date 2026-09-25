// A Custom request: what the customer sends from /custom-belt, and the one
// definition both the form and the endpoint check it against.
//
// The browser is no more the authority here than it is on an order: the
// endpoint re-parses everything with this same schema. What it does not do is
// trust the browser's word that the Artwork exists — that is checked against
// the Blob store — or treat the size label as anything but text to print.

import { z } from "zod";
import { isValidPhone } from "./phone.ts";

/** What the customer fills in by hand. */
export const customRequestFormSchema = z.object({
  name: z.string().trim().min(1, "Вкажи ім'я").max(100, "Занадто довге ім'я"),
  phone: z
    .string()
    .trim()
    .refine((v) => isValidPhone(v), "Невірний номер телефону"),
  comment: z.string().trim().max(1000, "Коментар до 1000 символів").default(""),
});

export type CustomRequestFormData = z.input<typeof customRequestFormSchema>;

/** Every Artwork is uploaded under this folder, and nothing is read from outside it. */
export const ARTWORK_FOLDER = "custom-belt/";

/** What an Artwork may be — the builder's file picker and the upload token agree on this. */
export const ARTWORK_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_ARTWORK_BYTES = 25 * 1024 * 1024;

const ARTWORK_PATHNAME = /^custom-belt\/[A-Za-z0-9._-]+$/;

/**
 * One flat folder, no climbing out of it. The single rule for both the upload
 * token and the request: the endpoint reads this file with the store's own
 * credentials and posts it to the team's chat, and a path the token allowed
 * but the request refused would leave an orphan behind.
 */
export function isArtworkPathname(pathname: string): boolean {
  return ARTWORK_PATHNAME.test(pathname) && !pathname.includes("..");
}

/** The size a customer picks when they do not know theirs. */
export const UNKNOWN_SIZE = "unknown";

const finite = z.number().finite();

/** Everything the endpoint receives: the form, plus the size, the Artwork and where it sits. */
export const customRequestSchema = customRequestFormSchema.extend({
  /** KeyCRM's own size ("M"), or UNKNOWN_SIZE. */
  size: z.string().trim().min(1, "Обери розмір або «Не знаю»").max(20),
  /** What the customer saw on the chip ("72.5-90 см") — printed, never matched on. */
  sizeLabel: z.string().trim().max(40).optional(),
  artwork: z.object({
    pathname: z.string().max(300).refine(isArtworkPathname, "Невідомий файл"),
    fileName: z.string().trim().max(200),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  placement: z.object({
    centerX: finite,
    centerY: finite,
    width: finite.positive(),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
});

export type CustomRequest = z.infer<typeof customRequestSchema>;
