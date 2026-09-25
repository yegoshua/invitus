"use client";

import { useEffect, useRef } from "react";

/**
 * The Telegram Login Widget is a script that inserts an iframe next to
 * itself. Rendered as a plain <script> it would not run after a client-side
 * navigation, and React 19 hoists async scripts into <head>, so it is
 * appended by hand into a container we own.
 */
export function TelegramLoginButton({ botUsername }: { botUsername: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.radius = "12";
    script.dataset.authUrl = new URL("/auth/telegram", window.location.origin).toString();
    host.replaceChildren(script);
    return () => host.replaceChildren();
  }, [botUsername]);

  return <div ref={container} className="flex min-h-12 justify-center" />;
}
