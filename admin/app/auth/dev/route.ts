// One-click login for `next dev`. The Telegram Login Widget only works on the
// domain registered with BotFather, so localhost cannot log in any other way.
// It still goes through the Finance chat membership check, and a production
// build answers 404: NODE_ENV is "production" there whatever the env says.

import { NextResponse, type NextRequest } from "next/server";
import { startSession } from "@/lib/auth/login";

export async function GET(request: NextRequest) {
  const devId = Number(process.env.ADMIN_DEV_TELEGRAM_ID);
  if (process.env.NODE_ENV !== "development" || !Number.isInteger(devId) || devId <= 0) {
    return new NextResponse(null, { status: 404 });
  }
  return startSession({ id: devId, name: "Dev" }, request.url);
}
