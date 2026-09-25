// Every request except the login flow passes through here. It does two jobs:
// sends anyone without a valid session to /login, and — once a day per
// session — asks Telegram whether they are still in the Finance chat, which
// is how removing someone from the chat locks them out without a deploy.

import { NextResponse, type NextRequest } from "next/server";
import { nowSeconds, sessionCookieOptions, sessionSecret } from "@/lib/auth/config";
import { checkFinanceChatMembership } from "@/lib/auth/membership";
import {
  decodeSession,
  encodeSession,
  needsRecheck,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

function leave(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function proxy(request: NextRequest) {
  const now = nowSeconds();
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret(), now);
  if (!session) return leave(request, "/login");
  if (!needsRecheck(session, now)) return NextResponse.next();

  const membership = await checkFinanceChatMembership(session.userId);
  if (membership === "not-member") return leave(request, "/no-access");
  // Telegram did not answer: keep the session on its last known answer. The
  // page's own check refuses it once that answer is two days old.
  if (membership === "unknown") return NextResponse.next();

  const renewed = encodeSession({ ...session, checkedAt: now }, sessionSecret());
  // Rewrite the cookie on the request too, so this very render already sees
  // the fresh check instead of the stale one it would otherwise refuse.
  request.cookies.set(SESSION_COOKIE, renewed);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, renewed, {
    ...sessionCookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS - (now - session.issuedAt),
  });
  return response;
}

export const config = {
  matcher: ["/((?!login|no-access|auth/|_next/|favicon.ico|robots.txt).*)"],
};
