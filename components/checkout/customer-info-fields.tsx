"use client";

import { useFormContext } from "react-hook-form";
import { LabeledField } from "@/components/ui/labeled-field";
import { IconInput } from "@/components/ui/icon-input";
import PersonIcon from "@/public/assets/icons/checkout/person.svg";
import PhoneIcon from "@/public/assets/icons/checkout/phone.svg";
import EmailIcon from "@/public/assets/icons/checkout/email.svg";
import type { CheckoutFormData } from "@/lib/checkout-schema";
import {
  UA_PHONE_PREFIX,
  formatPhone,
  digitsBefore,
  caretAfterDigits,
} from "@/lib/phone";

export function CustomerInfoFields() {
  const { register, setValue, getValues } = useFormContext<CheckoutFormData>();

  return (
    <div className="flex flex-col gap-6">
      <LabeledField name="fullName" label="Ім'я та прізвище">
        {({ id, hintId, error }) => (
          <IconInput
            id={id}
            icon={<PersonIcon />}
            type="text"
            autoComplete="name"
            placeholder="Арнольд Шварценеггер"
            aria-describedby={hintId}
            invalid={!!error}
            {...register("fullName")}
          />
        )}
      </LabeledField>

      <LabeledField name="phone" label="Номер телефону">
        {({ id, hintId, error }) => {
          const phoneReg = register("phone");
          return (
            <IconInput
              id={id}
              icon={<PhoneIcon />}
              type="tel"
              autoComplete="tel"
              placeholder="+380 67 123 45 67"
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

      <LabeledField name="email" label="Email (необов'язково)">
        {({ id, hintId, error }) => (
          <IconInput
            id={id}
            icon={<EmailIcon />}
            type="email"
            // Email keyboard on mobile (@ and . keys), no auto-capitalize /
            // autocorrect mangling the address.
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            placeholder="your@email.com"
            aria-describedby={hintId}
            invalid={!!error}
            {...register("email")}
          />
        )}
      </LabeledField>
    </div>
  );
}
