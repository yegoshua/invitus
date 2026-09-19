"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Fbq = (command: "track", eventName: "PageView") => void;

function getFbq(): Fbq | undefined {
  return (window as unknown as { fbq?: Fbq }).fbq;
}

// Loads fbevents.js once the page is interactive, and sends a PageView per
// route. The stock snippet fires PageView once at parse time, which on an App
// Router site counts a whole browsing session as one page.
export function MetaPixelLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (!getFbq() || document.getElementById("meta-pixel-lib")) return;
    const script = document.createElement("script");
    script.id = "meta-pixel-lib";
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    getFbq()?.("track", "PageView");
  }, [pathname]);

  return null;
}
