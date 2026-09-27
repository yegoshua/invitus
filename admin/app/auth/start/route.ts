// Step one of the login: remember a fresh state + PKCE verifier in a signed,
// short-lived cookie and send the browser to Telegram.

import { NextResponse, type NextRequest } from "next/server";
import {
  LOGIN_STATE_COOKIE,
  nowSeconds,
  sessionCookieOptions,
  sessionSecret,
  telegramLoginClient,
} from "@/lib/auth/config";
import { authorizeUrl, LOGIN_STATE_MAX_AGE_SECONDS, newLoginState } from "@/lib/auth/oidc";
import { sign } from "@/lib/auth/signed";

export async function GET(request: NextRequest) {
  const client = telegramLoginClient();
  if (!client) return NextResponse.redirect(new URL("/login?error=config", request.url));

  const login = newLoginState(nowSeconds());
  const redirectUri = new URL("/auth/callback", request.url).toString();
  const response = NextResponse.redirect(
    authorizeUrl({ clientId: client.clientId, redirectUri, login })
  );
  response.cookies.set(LOGIN_STATE_COOKIE, sign(login, sessionSecret()), {
    ...sessionCookieOptions,
    path: "/auth",
    maxAge: LOGIN_STATE_MAX_AGE_SECONDS,
  });
  return response;
}
