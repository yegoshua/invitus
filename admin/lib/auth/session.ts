// The session cookie: who is logged in, and when we last saw them in the
// Finance chat.
//
// Two clocks, deliberately different:
// - `issuedAt` bounds the whole session (a week): after that, log in again.
// - `checkedAt` is the last time Telegram confirmed membership. The proxy
//   re-asks after `RECHECK_AFTER_SECONDS`, which is what makes "removed from
//   the chat" mean "locked out" without a deploy. Data functions refuse a
//   session whose check is older than `STALE_AFTER_SECONDS` — if they ever
//   see one, the proxy was bypassed.

import { sign, unsign } from "./signed.ts";

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

export function encodeSession(session: Session, secret: string): string {
  return sign(session, secret);
}

/** The session if the cookie is ours and not past its week; otherwise null. */
export function decodeSession(
  token: string | undefined,
  secret: string,
  nowSeconds: number
): Session | null {
  const session = unsign(token, secret) as Session | null;
  if (
    !session ||
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
