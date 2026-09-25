// Where the Telegram Login Widget redirects after the user confirms.

import { NextResponse, type NextRequest } from "next/server";
import { nowSeconds } from "@/lib/auth/config";
import { startSession } from "@/lib/auth/login";
import { verifyTelegramLogin } from "@/lib/auth/telegram-login";

export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[auth] TELEGRAM_BOT_TOKEN is not set");
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const result = verifyTelegramLogin(params, token, nowSeconds());
  if (!result.ok) {
    console.warn("[auth] Telegram login refused:", result.reason);
    return NextResponse.redirect(new URL(`/login?error=${result.reason}`, request.url));
  }
  return startSession(result.user, request.url);
}
