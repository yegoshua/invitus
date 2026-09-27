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

export const LOGIN_STATE_COOKIE = "invitus_admin_login";

/** Client credentials from BotFather → bot → Login Widget. */
export function telegramLoginClient(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.TELEGRAM_LOGIN_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_LOGIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[auth] TELEGRAM_LOGIN_CLIENT_ID or TELEGRAM_LOGIN_CLIENT_SECRET is not set");
    return null;
  }
  return { clientId, clientSecret };
}
