// Step two: Telegram sends the browser back with a code. Check the state is
// the one this browser was given, trade the code for an ID token, verify it
// against Telegram's keys, then hand over to the Finance chat check.

import { createRemoteJWKSet } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import {
  LOGIN_STATE_COOKIE,
  nowSeconds,
  sessionSecret,
  telegramLoginClient,
} from "@/lib/auth/config";
import { startSession } from "@/lib/auth/login";
import { JWKS_URL, stateMatches, TOKEN_URL, verifyIdToken, type LoginState } from "@/lib/auth/oidc";
import { unsign } from "@/lib/auth/signed";

// Module scope so warm instances reuse fetched keys; jose refetches on an
// unknown `kid`, which is what a key rotation at Telegram looks like.
const telegramKeys = createRemoteJWKSet(new URL(JWKS_URL));

function fail(request: NextRequest, error: string, detail?: unknown) {
  console.warn("[auth] Telegram login failed:", error, detail ?? "");
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  response.cookies.delete({ name: LOGIN_STATE_COOKIE, path: "/auth" });
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // The user pressed "cancel" on Telegram's side.
  if (params.get("error")) return fail(request, "cancelled", params.get("error"));

  const client = telegramLoginClient();
  if (!client) return fail(request, "config");

  const saved = unsign(request.cookies.get(LOGIN_STATE_COOKIE)?.value, sessionSecret()) as LoginState | null;
  if (!stateMatches(saved, params.get("state"), nowSeconds())) return fail(request, "expired");

  const code = params.get("code");
  if (!code) return fail(request, "expired", "no code");

  let idToken: string;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${client.clientId}:${client.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: new URL("/auth/callback", request.url).toString(),
        client_id: client.clientId,
        code_verifier: saved.verifier,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const body = (await res.json()) as { id_token?: string; error?: string; error_description?: string };
    if (!res.ok || !body.id_token) return fail(request, "telegram", body.error_description ?? body.error ?? res.status);
    idToken = body.id_token;
  } catch (error) {
    return fail(request, "telegram", error);
  }

  let user;
  try {
    user = await verifyIdToken(idToken, { clientId: client.clientId, keys: telegramKeys });
  } catch (error) {
    return fail(request, "bad-signature", error);
  }

  const response = await startSession(user, request.url);
  response.cookies.delete({ name: LOGIN_STATE_COOKIE, path: "/auth" });
  return response;
}
