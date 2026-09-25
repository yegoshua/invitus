export function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  // A short or missing secret would make every session forgeable, so this
  // throws instead of falling back — the Admin is down, not open.
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters");
  }
  return secret;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
