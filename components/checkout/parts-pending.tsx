"use client";

import { useEffect, useRef, useState } from "react";
import { CTAButton } from "@/components/ui/cta-button";
import { ClearCartOnMount } from "./clear-cart-on-mount";
import { ConfettiOverlay } from "./confetti-overlay";
import {
  ErrorCard,
  PendingCard,
  ResultLayout,
  SuccessCard,
} from "./payment-result-cards";
import { trackEvent } from "@/lib/gtag";

/** Monobank gives the customer 15 minutes; we watch a little longer. */
const GIVE_UP_AFTER_MS = 16 * 60 * 1000;
const POLL_EVERY_MS = 3000;

type Status =
  | { kind: "pending" }
  | { kind: "approved"; total: number | null; storeOrderId: string | null }
  | { kind: "failed"; reason: string }
  | { kind: "timeout" }
  | { kind: "unreachable" };

interface StatusResponse {
  outcome?: "pending" | "approved" | "failed";
  reason?: string;
  total?: number | null;
  storeOrderId?: string | null;
  error?: string;
}

/**
 * Polls the instalment order until Monobank has an answer.
 *
 * The state lives in Monobank, not here: reloading the tab re-polls and lands
 * on the same card, and a customer who confirmed in the app and closed this
 * tab still has a paid order, because the callback — not this page — is what
 * marks it paid. This page only decides what to show.
 */
export function PartsPending({
  partsOrderId,
  orderRef,
  totalHint,
}: {
  partsOrderId: string;
  /** KeyCRM order number, for the purchase event when the bank has none. */
  orderRef: string | null;
  /** The server's total from the checkout, same purpose. */
  totalHint: number | null;
}) {
  const [status, setStatus] = useState<Status>({ kind: "pending" });
  // Consecutive network failures. One is a blip; several in a row means the
  // page cannot know, and it says so instead of spinning for sixteen minutes.
  const failures = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        setStatus({ kind: "timeout" });
        return;
      }
      try {
        const res = await fetch(
          `/api/monobank/parts/status?order=${encodeURIComponent(partsOrderId)}`,
          { cache: "no-store" }
        );
        const body = (await res.json().catch(() => ({}))) as StatusResponse;
        if (cancelled) return;
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        failures.current = 0;

        if (body.outcome === "approved") {
          setStatus({
            kind: "approved",
            total: body.total ?? null,
            storeOrderId: body.storeOrderId ?? null,
          });
          return;
        }
        if (body.outcome === "failed") {
          setStatus({ kind: "failed", reason: body.reason || "monobank відхилив заявку." });
          return;
        }
      } catch {
        if (cancelled) return;
        failures.current += 1;
        if (failures.current >= 5) {
          setStatus({ kind: "unreachable" });
          return;
        }
      }
      window.setTimeout(poll, POLL_EVERY_MS);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [partsOrderId]);

  // GA4 purchase, once, when the plan is approved — the instalment analogue of
  // the acquiring page's TrackOnce. Items are not available here either.
  const tracked = useRef(false);
  useEffect(() => {
    if (status.kind !== "approved" || tracked.current) return;
    tracked.current = true;
    trackEvent("purchase", {
      transaction_id: status.storeOrderId || orderRef || partsOrderId,
      value: status.total ?? totalHint ?? 0,
      items: [],
    });
  }, [status, partsOrderId, orderRef, totalHint]);

  if (status.kind === "approved") {
    return (
      <ResultLayout>
        <ClearCartOnMount />
        <ConfettiOverlay />
        <SuccessCard description="Покупку частинами підтверджено! Твоє екіпірування вже збирається в дорогу. Лишилось познайомити його із залом." />
      </ResultLayout>
    );
  }

  if (status.kind === "failed") {
    return (
      <ResultLayout>
        <ErrorCard
          title="Покупка частинами не оформилась"
          description={status.reason}
          ctaHref="/checkout"
          ctaLabel="Обрати інший спосіб оплати"
        />
      </ResultLayout>
    );
  }

  if (status.kind === "timeout") {
    return (
      <ResultLayout>
        <ErrorCard
          title="Час на підтвердження сплив"
          description="Ми не дочекалися підтвердження в застосунку mono. Спробуй оформити ще раз — цього разу зайди в застосунок одразу."
          ctaHref="/checkout"
          ctaLabel="Спробувати ще раз"
        />
      </ResultLayout>
    );
  }

  if (status.kind === "unreachable") {
    return (
      <ResultLayout>
        <PendingCard
          title="Не вдається перевірити статус"
          description="Зв'язок із банком перервався. Якщо ти вже підтвердив покупку в застосунку mono — замовлення прийнято, ми отримали підтвердження. Онови сторінку, щоб перевірити."
        >
          <CTAButton width="fill" onClick={() => window.location.reload()}>
            Оновити
          </CTAButton>
        </PendingCard>
      </ResultLayout>
    );
  }

  return (
    <ResultLayout>
      <PendingCard
        title="Підтверди в застосунку mono"
        description={
          <>
            Ми надіслали запит у твій застосунок monobank. Відкрий його,
            підтверди покупку частинами — і перший платіж спишеться одразу.
            <br />
            <span className="text-white/50 text-sm">
              Ця сторінка оновиться сама. У тебе є 15 хвилин.
            </span>
          </>
        }
      >
        <CTAButton href="/checkout" variant="outline" width="fill">
          Обрати інший спосіб оплати
        </CTAButton>
      </PendingCard>
    </ResultLayout>
  );
}
