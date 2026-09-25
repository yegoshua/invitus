// The check every page and every data function runs, independently of the
// proxy (ADR 0002). Proxy-only auth has been bypassed in Next.js before
// (CVE-2025-29927); here a request that skipped the proxy meets the same
// signature check, and a membership answer too old to have come through it.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nowSeconds, sessionSecret } from "./config";
import { decodeSession, isStale, SESSION_COOKIE, type Session } from "./session";

export async function requireAdmin(): Promise<Session> {
  const jar = await cookies();
  const now = nowSeconds();
  const session = decodeSession(jar.get(SESSION_COOKIE)?.value, sessionSecret(), now);
  if (!session || isStale(session, now)) redirect("/login");
  return session;
}
