// The session cookie: who is logged in, and when we last saw them in the
// Finance chat.
//
// `<base64url payload>.<base64url HMAC>` — no JWT library, because there is
// exactly one issuer and one reader and both are this file.
//
// Two clocks, deliberately different:
// - `issuedAt` bounds the whole session (a week): after that, log in again.
// - `checkedAt` is the last time Telegram confirmed membership. The proxy
//   re-asks after `RECHECK_AFTER_SECONDS`, which is what makes "removed from
//   the chat" mean "locked out" without a deploy. Data functions refuse a
//   session whose check is older than `STALE_AFTER_SECONDS` — if they ever
//   see one, the proxy was bypassed.

import { createHmac, timingSafeEqual } from "node:crypto";

export interface Session {
  userId: number;
  name: string;
  issuedAt: number;
  checkedAt: number;
}

export const SESSION_COOKIE = "invitus_admin_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const RECHECK_AFTER_SECONDS = 24 * 60 * 60;
export const STALE_AFTER_SECONDS = 2 * RECHECK_AFTER_SECONDS;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: Session, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** The session if the cookie is ours and not past its week; otherwise null. */
export function decodeSession(
  token: string | undefined,
  secret: string,
  nowSeconds: number
): Session | null {
  if (!token) return null;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  let session: Session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (
    typeof session.userId !== "number" ||
    typeof session.issuedAt !== "number" ||
    typeof session.checkedAt !== "number"
  ) {
    return null;
  }
  if (nowSeconds - session.issuedAt > SESSION_MAX_AGE_SECONDS) return null;
  return session;
}

export function needsRecheck(session: Session, nowSeconds: number): boolean {
  return nowSeconds - session.checkedAt > RECHECK_AFTER_SECONDS;
}

export function isStale(session: Session, nowSeconds: number): boolean {
  return nowSeconds - session.checkedAt > STALE_AFTER_SECONDS;
}
