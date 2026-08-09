"use client";

import { useId, useState } from "react";
import { Check, TicketPercent, X } from "lucide-react";
import { IconInput } from "@/components/ui/icon-input";
import { formatPrice } from "@/lib/format";
import {
  useAppliedPromo,
  usePromo,
  usePromoError,
  usePromoStatus,
} from "@/hooks/use-promo";

/**
 * The promo code field. Lives on the checkout page, not in the cart — the
 * discount is only meaningful against a cart the server has just priced.
 *
 * Everything here is `type="button"`: the field sits inside the checkout form,
 * and an Enter keypress that submitted the order instead of applying the code
 * would be an expensive misunderstanding.
 */
export function PromoCodeField() {
  const { apply, remove } = usePromo();
  const { code: appliedCode, discount } = useAppliedPromo();
  const status = usePromoStatus();
  const error = usePromoError();

  const [draft, setDraft] = useState("");
  const id = useId();
  const hintId = `${id}-hint`;

  const checking = status === "checking";

  if (appliedCode) {
    return (
      <div>
        <div className="flex items-center gap-3 h-12 lg:h-14 px-5 rounded-[var(--radius-checkout-field)] bg-[var(--color-checkout-field)] border-[1.5px] border-coral/40">
          <Check className="w-5 h-5 shrink-0 text-coral" strokeWidth={2} />
          <span className="flex-1 min-w-0 truncate text-[17px] font-medium text-white">
            {appliedCode}
          </span>
          <span className="text-[17px] font-medium text-coral whitespace-nowrap">
            −{formatPrice(discount)} ₴
          </span>
          <button
            type="button"
            onClick={() => {
              remove();
              setDraft("");
            }}
            aria-label="Прибрати промокод"
            className="flex items-center justify-center text-white/40 transition-colors hover:text-white focus-visible:text-white outline-none"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  const submit = () => {
    if (checking || !draft.trim()) return;
    void apply(draft);
  };

  return (
    <div>
      <div className="flex gap-3">
        <IconInput
          id={id}
          icon={<TicketPercent />}
          placeholder="Промокод"
          value={draft}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={checking}
          invalid={status === "rejected"}
          aria-describedby={error ? hintId : undefined}
          containerClassName="flex-1 min-w-0"
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // Inside the checkout form, so Enter would otherwise place the order.
            e.preventDefault();
            submit();
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={checking || !draft.trim()}
          className="shrink-0 h-12 lg:h-14 px-6 rounded-[var(--radius-checkout-field)] bg-white/10 text-[15px] font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          {checking ? "Перевірка…" : "Застосувати"}
        </button>
      </div>

      {error && (
        <p id={hintId} role="alert" className="mt-2 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
