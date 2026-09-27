// A value we hand to the browser and must be able to trust when it comes
// back: `<base64url JSON>.<base64url HMAC>`. Used for the session cookie and
// for the short-lived login state. No JWT library — one issuer, one reader.

import { createHmac, timingSafeEqual } from "node:crypto";

function mac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function sign(value: unknown, secret: string): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${mac(payload, secret)}`;
}

/** The parsed value if we signed it, otherwise null. Never throws. */
export function unsign(token: string | undefined, secret: string): unknown {
  if (!token) return null;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(mac(payload, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}
