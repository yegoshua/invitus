"use client";

import { useEffect } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { RadioCard } from "@/components/ui/radio-card";
import { MonoPaw } from "@/components/ui/mono-paw";
import { cn } from "@/lib/utils";
import { useCartTotal } from "@/hooks/use-cart";
import { useAppliedPromo } from "@/hooks/use-promo";
import {
  PARTS_OPTIONS,
  partsAvailable,
  partsOptionLabel,
  type PartsCount,
} from "@/lib/installments";
import type { CheckoutFormData } from "@/lib/checkout-schema";

type Method = CheckoutFormData["paymentMethod"];

const ONLINE = { value: "online", label: "Оплата онлайн" } as const;
const PARTS = { value: "parts", label: "Оплата частинами monobank" } as const;
const COD = { value: "cod", label: "Оплата після отримання" } as const;

export function PaymentMethodRadio() {
  const { control, setValue } = useFormContext<CheckoutFormData>();
  const method = useWatch({ control, name: "paymentMethod" });
  const subtotal = useCartTotal();
  const { discount } = useAppliedPromo();
  // The same total the server will judge the floor against: goods less promo.
  const total = subtotal - discount;
  const partsOffered = partsAvailable(total);

  // The cart can shrink under an open checkout — a size removed, a promo that
  // landed — and take the option with it. The form then must not sit on a
  // method the server will refuse: fall back to online, which is the default
  // and the closest in spirit (pay now, just all at once).
  useEffect(() => {
    if (method === "parts" && !partsOffered) {
      setValue("paymentMethod", "online", { shouldDirty: true });
    }
  }, [method, partsOffered, setValue]);

  const options: ReadonlyArray<{ value: Method; label: string }> = partsOffered
    ? [ONLINE, PARTS, COD]
    : [ONLINE, COD];

  return (
    <Controller
      name="paymentMethod"
      control={control}
      render={({ field }) => (
        <div role="radiogroup" className="flex flex-col gap-3 lg:gap-4">
          {options.map((option) => (
            <div key={option.value} className="flex flex-col gap-3 lg:gap-4">
              <div className="relative">
                <RadioCard
                  name={field.name}
                  value={option.value}
                  label={option.label}
                  checked={field.value === option.value}
                  selected={field.value === option.value}
                  onChange={() => field.onChange(option.value)}
                  onBlur={field.onBlur}
                />
                {option.value === "parts" && (
                  <MonoPaw className="absolute -top-3 right-1 size-8" />
                )}
              </div>
              {option.value === "parts" && field.value === "parts" && (
                <PartsPicker total={total} />
              )}
            </div>
          ))}
        </div>
      )}
    />
  );
}

/**
 * The three plans under the instalment radio — a row of equal chips on
 * desktop, stacked on a phone, each reading «6 × 684 ₴» for the cart as it is
 * now. Radios rather than buttons: it is one choice among three, and the
 * arrow keys should move between them.
 */
function PartsPicker({ total }: { total: number }) {
  const { control } = useFormContext<CheckoutFormData>();

  return (
    <Controller
      name="parts"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-3 lg:gap-4">
          <div
            role="radiogroup"
            aria-label="Кількість платежів"
            className="flex flex-col gap-3 lg:flex-row lg:gap-3"
          >
            {PARTS_OPTIONS.map((parts) => (
              <PartsOption
                key={parts}
                name={field.name}
                parts={parts}
                label={partsOptionLabel(total, parts)}
                selected={field.value === parts}
                onSelect={() => field.onChange(parts)}
                onBlur={field.onBlur}
              />
            ))}
          </div>
          <p className="text-xs/4 tracking-[0.02em] lg:text-sm/5 lg:tracking-[0.01em] text-white/64">
            Без комісії! Оплата рівними частинами до {Math.max(...PARTS_OPTIONS)}{" "}
            місяців. Перший внесок знімається під час оформлення, наступні —
            щомісяця. Підтвердження в додатку monobank.
          </p>
        </div>
      )}
    />
  );
}

function PartsOption({
  name,
  parts,
  label,
  selected,
  onSelect,
  onBlur,
}: {
  name: string;
  parts: PartsCount;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onBlur: () => void;
}) {
  return (
    <label
      className={cn(
        // `flex-1` only in the desktop row: in the stacked mobile column it
        // would set the basis to 0 and squash the chip to its text height.
        "lg:flex-1 flex items-center justify-center h-12 lg:h-14 px-4",
        "bg-[var(--color-checkout-field)] rounded-[var(--radius-checkout-field)]",
        "border border-transparent",
        "text-white text-sm/5 lg:text-base/6 font-medium tracking-[0.01em] text-center cursor-pointer",
        "transition-[border-color,background] duration-150 hover:bg-[#242424]",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white",
        selected && "border-coral"
      )}
    >
      <input
        type="radio"
        name={name}
        value={parts}
        checked={selected}
        onChange={onSelect}
        onBlur={onBlur}
        className="sr-only"
      />
      {label}
    </label>
  );
}
