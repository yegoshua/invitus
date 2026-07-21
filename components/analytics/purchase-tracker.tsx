"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/gtag";

interface PurchaseTrackerProps {
  transactionId: string;
  /** Order total in UAH. */
  value: number;
}

// Fires a GA4 `purchase` on the (server-rendered) success screen for online
// payments. Deduped per transaction via sessionStorage so a page refresh
// doesn't double-count revenue.
export function PurchaseTracker({ transactionId, value }: PurchaseTrackerProps) {
  useEffect(() => {
    const key = `invitus_purchase_tracked_${transactionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private mode) — still track once per mount.
    }
    // Items aren't available here (server page, cart already cleared) — GA4
    // accepts purchase without items; revenue still attributes correctly.
    trackEvent("purchase", { transaction_id: transactionId, value, items: [] });
  }, [transactionId, value]);

  return null;
}
