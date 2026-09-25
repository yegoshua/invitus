"use client";

import { useFormContext } from "react-hook-form";
import { LabeledField } from "@/components/ui/labeled-field";
import { IconInput } from "@/components/ui/icon-input";
import PhoneIcon from "@/public/assets/icons/checkout/phone.svg";
import {
  UA_PHONE_PREFIX,
  formatPhone,
  digitsBefore,
  caretAfterDigits,
} from "@/lib/phone";

/**
 * The phone field of any form whose schema has a `phone` string: formatted as
 * you type, +380 offered on focus. Shared by the checkout and the Custom
 * request so the two cannot disagree about what a phone number looks like.
 */
export function PhoneField({ label = "Номер телефону" }: { label?: string }) {
  const { register, setValue, getValues } = useFormContext<{ phone: string }>();

  return (
    <LabeledField name="phone" label={label}>
      {({ id, hintId, error }) => {
        const phoneReg = register("phone");
        return (
          <IconInput
            id={id}
            icon={<PhoneIcon />}
            type="tel"
            autoComplete="tel"
            placeholder="+380 (67) 123 45 67"
            aria-describedby={hintId}
            invalid={!!error}
            {...phoneReg}
            onChange={(e) => {
              // Format as-you-type, restoring the caret by counting how many
              // digits sat before it (so mid-string edits don't fling the
              // caret to the end).
              const el = e.target;
              const caret = el.selectionStart ?? el.value.length;
              const atEnd = caret === el.value.length;
              const nBefore = digitsBefore(el.value, caret);
              const formatted = formatPhone(el.value) || UA_PHONE_PREFIX;
              el.value = formatted;
              const pos = atEnd
                ? formatted.length
                : caretAfterDigits(formatted, nBefore);
              el.setSelectionRange(pos, pos);
              phoneReg.onChange(e);
            }}
            onFocus={() => {
              if (!getValues("phone")) {
                setValue("phone", UA_PHONE_PREFIX, { shouldValidate: false });
              }
            }}
            onBlur={(e) => {
              // If only the prefix was added but user typed nothing, clear it
              // so the placeholder reappears and validation shows the right state.
              if (e.target.value.trim() === UA_PHONE_PREFIX.trim()) {
                setValue("phone", "", { shouldValidate: false });
              }
              phoneReg.onBlur(e);
            }}
          />
        );
      }}
    </LabeledField>
  );
}
