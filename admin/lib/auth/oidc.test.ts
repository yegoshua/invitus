import assert from "node:assert/strict";
import { test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import {
  authorizeUrl,
  LOGIN_STATE_MAX_AGE_SECONDS,
  newLoginState,
  pkceChallenge,
  stateMatches,
  TELEGRAM_ISSUER,
  userFromClaims,
  verifyIdToken,
} from "./oidc.ts";

const NOW = 1_780_000_000;
const CLIENT_ID = "8123456789";

test("the PKCE challenge is the RFC 7636 one", () => {
  // RFC 7636, appendix B.
  assert.equal(
    pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  );
});

test("the authorize URL asks for a code with S256 PKCE and never for the phone", () => {
  const login = newLoginState(NOW);
  const url = new URL(authorizeUrl({ clientId: CLIENT_ID, redirectUri: "https://a.example/auth/callback", login }));
  assert.equal(url.origin + url.pathname, `${TELEGRAM_ISSUER}/auth`);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), pkceChallenge(login.verifier));
  assert.equal(url.searchParams.get("state"), login.state);
  assert.equal(url.searchParams.get("scope"), "openid profile");
  assert.ok(url.search.includes("scope=openid%20profile"));
  // The verifier is the secret half; it must never travel through the browser.
  assert.ok(!url.toString().includes(login.verifier));
});

test("two logins never share a state or a verifier", () => {
  const a = newLoginState(NOW);
  const b = newLoginState(NOW);
  assert.notEqual(a.state, b.state);
  assert.notEqual(a.verifier, b.verifier);
});

test("state must match what we issued, and be recent", () => {
  const login = newLoginState(NOW);
  assert.equal(stateMatches(login, login.state, NOW + 60), true);
  assert.equal(stateMatches(login, "someone-else", NOW + 60), false);
  assert.equal(stateMatches(login, null, NOW + 60), false);
  assert.equal(stateMatches(null, login.state, NOW + 60), false);
  assert.equal(stateMatches(login, login.state, NOW + LOGIN_STATE_MAX_AGE_SECONDS + 1), false);
});

test("the user comes from `id`, falling back to a numeric `sub`", () => {
  assert.deepEqual(userFromClaims({ id: 42, sub: "x", name: "Ігор" }), { id: 42, name: "Ігор" });
  assert.deepEqual(userFromClaims({ sub: "42", preferred_username: "owner" }), { id: 42, name: "owner" });
  assert.equal(userFromClaims({ sub: "not-a-number" }), null);
  assert.equal(userFromClaims({}), null);
});

// A key pair standing in for Telegram's, so the tests sign real tokens.
const { publicKey, privateKey } = await generateKeyPair("RS256");
const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256" }] });

function token(claims: Record<string, unknown>, key = privateKey) {
  return new SignJWT({ id: 42, name: "Ігор", ...claims })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer((claims.iss as string) ?? TELEGRAM_ISSUER)
    .setIssuedAt(NOW)
    .setExpirationTime(NOW + 3600)
    .sign(key);
}

test("a token Telegram signed for us is accepted, with a string or numeric aud", async () => {
  for (const aud of [CLIENT_ID, Number(CLIENT_ID)]) {
    const user = await verifyIdToken(await token({ aud }), { clientId: CLIENT_ID, keys, nowSeconds: NOW + 5 });
    assert.deepEqual(user, { id: 42, name: "Ігор" });
  }
});

test("a token for another bot is refused", async () => {
  await assert.rejects(
    verifyIdToken(await token({ aud: "999" }), { clientId: CLIENT_ID, keys, nowSeconds: NOW + 5 })
  );
});

test("a token from another issuer is refused", async () => {
  await assert.rejects(
    verifyIdToken(await token({ aud: CLIENT_ID, iss: "https://evil.example" }), { clientId: CLIENT_ID, keys, nowSeconds: NOW + 5 })
  );
});

test("a token signed with some other key is refused", async () => {
  const other = await generateKeyPair("RS256");
  await assert.rejects(
    verifyIdToken(await token({ aud: CLIENT_ID }, other.privateKey), { clientId: CLIENT_ID, keys, nowSeconds: NOW + 5 })
  );
});

test("an expired token is refused", async () => {
  await assert.rejects(
    verifyIdToken(await token({ aud: CLIENT_ID }), { clientId: CLIENT_ID, keys, nowSeconds: NOW + 7200 })
  );
});
