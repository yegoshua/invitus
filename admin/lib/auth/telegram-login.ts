// Verifies the payload the Telegram Login Widget hands back.
//
// Telegram signs the fields with HMAC-SHA256, keyed by SHA-256 of the bot
// token: https://core.telegram.org/widgets/login#checking-authorization.
// Pure and dependency-free so node:test runs it directly — this is the one
// function standing between a stranger and the shop's finances.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

export type LoginResult =
  | { ok: true; user: TelegramUser }
  | { ok: false; reason: "missing-fields" | "bad-signature" | "expired" };

/**
 * A login link is a bearer credential until it expires. A day is Telegram's
 * own suggestion; we take ten minutes, since the widget redirects straight
 * to us and nobody has a reason to replay an old one.
 */
export const LOGIN_MAX_AGE_SECONDS = 10 * 60;

export function verifyTelegramLogin(
  params: Record<string, string>,
  botToken: string,
  nowSeconds: number
): LoginResult {
  const { hash, ...fields } = params;
  if (!hash || !fields.id || !fields.auth_date || !fields.first_name) {
    return { ok: false, reason: "missing-fields" };
  }

  const checkString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad-signature" };
  }

  const authDate = Number(fields.auth_date);
  if (!Number.isFinite(authDate) || nowSeconds - authDate > LOGIN_MAX_AGE_SECONDS) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    user: {
      id: Number(fields.id),
      firstName: fields.first_name,
      lastName: fields.last_name,
      username: fields.username,
    },
  };
}
