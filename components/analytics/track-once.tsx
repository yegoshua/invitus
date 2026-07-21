"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type GAEventMap, type GAEventName } from "@/lib/gtag";

interface TrackOnceProps<E extends GAEventName> {
  event: E;
  params: GAEventMap[E];
  /**
   * Dedupes across page reloads via sessionStorage (e.g. a payment success
   * page refresh must not double-count a purchase). Without it the event
   * fires once per mount.
   */
  dedupeKey?: string;
}

// Declarative one-shot analytics: rendering this component IS the trigger.
// Put it in the JSX branch that represents the tracked moment — e.g. the
// checkout form for begin_checkout — instead of wiring refs/effects into the
// page component. Fires once per mount (StrictMode-safe); params are latched
// at first commit.
export function TrackOnce<E extends GAEventName>({
  event,
  params,
  dedupeKey,
}: TrackOnceProps<E>) {
  const fired = useRef(false);
  const latest = useRef({ event, params });
  latest.current = { event, params };

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    if (dedupeKey) {
      const key = `invitus_ga_once_${dedupeKey}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // sessionStorage unavailable (private mode) — still fire once per mount.
      }
    }

    trackEvent(latest.current.event, latest.current.params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
