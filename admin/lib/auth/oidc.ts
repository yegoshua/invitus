// Log in with Telegram, OpenID Connect edition:
// https://core.telegram.org/bots/telegram-login
//
// Authorization code + PKCE. We send the browser to Telegram with a random
// `state` and a PKCE challenge, Telegram sends it back with a code, we trade
// the code (plus the verifier only we know) for an ID token, and check that
// token's signature against Telegram's published keys. Pure except for the
// JWKS fetch, which is injected so the tests can sign tokens of their own.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

export const TELEGRAM_ISSUER = "https://oauth.telegram.org";
export const AUTHORIZE_URL = `${TELEGRAM_ISSUER}/auth`;
export const TOKEN_URL = `${TELEGRAM_ISSUER}/token`;
export const JWKS_URL = `${TELEGRAM_ISSUER}/.well-known/jwks.json`;

/** How long the round trip to Telegram may take before we start over. */
export const LOGIN_STATE_MAX_AGE_SECONDS = 10 * 60;

export interface TelegramUser {
  id: number;
  name: string;
}

/** What we remember between sending the browser away and it coming back. */
export interface LoginState {
  state: string;
  verifier: string;
  createdAt: number;
}

function random(): string {
  return randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function newLoginState(nowSeconds: number): LoginState {
  return { state: random(), verifier: random(), createdAt: nowSeconds };
}

export function authorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  login: LoginState;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    // Name only. `phone` would put the owners' numbers in a token for no use.
    scope: "openid profile",
    state: params.login.state,
    code_challenge: pkceChallenge(params.login.verifier),
    code_challenge_method: "S256",
    // URLSearchParams writes the space as "+"; Telegram's docs spell it %20,
    // and a scope misread by the server would fail only at login time.
  }).toString().replaceAll("+", "%20");
  return url.toString();
}

/**
 * Is the `state` Telegram echoed back the one we issued, recently? A
 * mismatch is someone else's login being replayed into this browser.
 */
export function stateMatches(
  saved: LoginState | null,
  returned: string | null,
  nowSeconds: number
): saved is LoginState {
  if (!saved || !returned || typeof saved.state !== "string") return false;
  if (nowSeconds - saved.createdAt > LOGIN_STATE_MAX_AGE_SECONDS) return false;
  const a = Buffer.from(saved.state);
  const b = Buffer.from(returned);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The Telegram user in a verified ID token, or null if it names nobody. */
export function userFromClaims(claims: JWTPayload): TelegramUser | null {
  // Telegram documents a numeric `id`; `sub` is the OIDC subject and has
  // been the same number in practice. Prefer the documented one.
  const raw = claims.id ?? claims.sub;
  const id = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const name =
    (typeof claims.name === "string" && claims.name) ||
    (typeof claims.preferred_username === "string" && claims.preferred_username) ||
    String(id);
  return { id, name };
}

/** Checks signature, issuer, audience and expiry; throws if any is wrong. */
export async function verifyIdToken(
  idToken: string,
  opts: { clientId: string; keys: JWTVerifyGetKey; nowSeconds?: number }
): Promise<TelegramUser> {
  const { payload } = await jwtVerify(idToken, opts.keys, {
    issuer: TELEGRAM_ISSUER,
    requiredClaims: ["aud", "exp"],
    currentDate: opts.nowSeconds ? new Date(opts.nowSeconds * 1000) : undefined,
  });
  // Checked by hand rather than with jose's `audience` option: the audience
  // is the bot id, and a number-typed `aud` would fail jose's string check
  // for a token that is perfectly ours.
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.some((aud) => String(aud) === opts.clientId)) {
    throw new Error("ID token was issued for another client");
  }
  const user = userFromClaims(payload);
  if (!user) throw new Error("ID token names no Telegram user");
  return user;
}
