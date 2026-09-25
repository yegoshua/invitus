"use client";

import { useFormContext } from "react-hook-form";
import { LabeledField } from "@/components/ui/labeled-field";
import { IconInput } from "@/components/ui/icon-input";
import PersonIcon from "@/public/assets/icons/checkout/person.svg";
import EmailIcon from "@/public/assets/icons/checkout/email.svg";
import type { CheckoutFormData } from "@/lib/checkout-schema";
import { PhoneField } from "@/components/ui/phone-field";

export function CustomerInfoFields() {
  const { register } = useFormContext<CheckoutFormData>();

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

      <PhoneField />

      <LabeledField name="email" label="Email">
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
