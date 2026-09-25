"use client";

import { useActionState, useState } from "react";
import { saveRates, type FeeRatesFormState } from "@/app/(app)/expenses/actions";

const field =
  "h-11 w-full min-w-0 rounded-[12px] border border-field bg-field pr-9 pl-3.5 text-right text-base text-white outline-none focus:border-primary aria-invalid:border-[var(--color-error)]";

/** "1,3", as a person writes a percent. */
function shown(percent: number): string {
  return String(percent).replace(".", ",");
}

/**
 * The rate per payment method that an estimated Payment fee uses. The actual
 * fee from Monobank's statement, where there is one, does not depend on it.
 */
export function FeeRatesForm({ methods }: { methods: Array<{ id: number; label: string; percent: number }> }) {
  const [state, save, saving] = useActionState<FeeRatesFormState, FormData>(saveRates, {});
  // Controlled, so a refused save keeps what was typed.
  const [v, setV] = useState(() => Object.fromEntries(methods.map((m) => [m.id, shown(m.percent)])));
  const errors = state.errors ?? {};

  return (
    <form action={save} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 dt:grid-cols-3">
        {methods.map((m) => (
          <label key={m.id} className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3">
            <span className="text-[15px]">{m.label}</span>
            <span className="relative">
              <input
                name={`rate_${m.id}`}
                value={v[m.id]}
                onChange={(e) => setV((x) => ({ ...x, [m.id]: e.target.value }))}
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={errors[m.id] ? true : undefined}
                aria-describedby={errors[m.id] ? `rate-${m.id}-error` : undefined}
                className={field}
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#737373]">%</span>
            </span>
            {errors[m.id] && (
              <span id={`rate-${m.id}-error`} className="col-span-2 text-[13px] text-[var(--color-error)]">
                {errors[m.id]}
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.message && (
          <p role="alert" className="mr-auto text-[13px] text-[var(--color-error)]">
            {state.message}
          </p>
        )}
        {state.saved && !saving && (
          <p role="status" className="mr-auto text-[13px] text-good">
            Збережено — оцінки перераховано
          </p>
        )}
        <button disabled={saving} className="h-11 rounded-[14px] bg-primary px-5 text-[15px] font-semibold text-black hover:bg-[var(--color-coral-dark)] disabled:opacity-50">
          {saving ? "Зберігаю…" : "Зберегти ставки"}
        </button>
      </div>
    </form>
  );
}
