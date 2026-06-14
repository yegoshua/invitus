"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Clarity from "@microsoft/clarity";

const CLARITY_PROJECT_ID = "x6vmgy8klr";
const ANON_ID_STORAGE_KEY = "invitus_anon_id";

function isTrackingDisabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local")
  );
}

function getAnonUserId(): string {
  let id = localStorage.getItem(ANON_ID_STORAGE_KEY);
  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(ANON_ID_STORAGE_KEY, id);
  }
  return id;
}

export function ClarityAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (isTrackingDisabled()) return;
    Clarity.init(CLARITY_PROJECT_ID);
    Clarity.setTag(
      "env",
      window.location.hostname.includes("vercel.app") ? "production" : "other"
    );
    const anonId = getAnonUserId();
    Clarity.identify(anonId, undefined, undefined, anonId.slice(0, 13));
  }, []);

  useEffect(() => {
    if (isTrackingDisabled() || !pathname) return;
    Clarity.setTag("page", pathname);
  }, [pathname]);

  return null;
}
