import { NextResponse } from "next/server";
import { nowSeconds, sessionCookieOptions, sessionSecret } from "./config";
import { checkFinanceChatMembership } from "./membership";
import { encodeSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./session";
import type { TelegramUser } from "./telegram-login";

/**
 * Turns a verified Telegram identity into a session, or into the reason it
 * cannot have one. A fresh login needs a definite yes from Telegram — an
 * outage is not a reason to let someone in.
 */
export async function startSession(user: TelegramUser, origin: string): Promise<NextResponse> {
  const membership = await checkFinanceChatMembership(user.id);
  if (membership === "not-member") {
    return NextResponse.redirect(new URL("/no-access", origin));
  }
  if (membership === "unknown") {
    return NextResponse.redirect(new URL("/login?error=telegram", origin));
  }

  const now = nowSeconds();
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set(
    SESSION_COOKIE,
    encodeSession({ userId: user.id, name, issuedAt: now, checkedAt: now }, sessionSecret()),
    { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_SECONDS }
  );
  return response;
}
