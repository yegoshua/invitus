"use client";

import { Controller, useFormContext } from "react-hook-form";
import { RadioCard } from "@/components/ui/radio-card";
import type { CheckoutFormData } from "@/lib/checkout-schema";

const OPTIONS: Array<{ value: "online" | "cod"; label: string }> = [
  { value: "online", label: "Оплата онлайн" },
  { value: "cod", label: "Оплата після отримання" },
];

export function PaymentMethodRadio() {
  const { control } = useFormContext<CheckoutFormData>();

  return (
    <Controller
      name="paymentMethod"
      control={control}
      render={({ field }) => (
        <div role="radiogroup" className="flex flex-col gap-4">
          {OPTIONS.map((option) => (
            <RadioCard
              key={option.value}
              name={field.name}
              value={option.value}
              label={option.label}
              checked={field.value === option.value}
              selected={field.value === option.value}
              onChange={() => field.onChange(option.value)}
              onBlur={field.onBlur}
            />
          ))}
        </div>
      )}
    />
  );
}
