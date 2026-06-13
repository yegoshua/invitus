"use client";

import { useFormContext } from "react-hook-form";
import { LabeledField } from "@/components/ui/labeled-field";
import { IconInput } from "@/components/ui/icon-input";
import PersonIcon from "@/public/assets/icons/checkout/person.svg";
import PhoneIcon from "@/public/assets/icons/checkout/phone.svg";
import EmailIcon from "@/public/assets/icons/checkout/email.svg";
import type { CheckoutFormData } from "@/lib/checkout-schema";

const PHONE_PREFIX = "+380 ";

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
              onFocus={() => {
                if (!getValues("phone")) {
                  setValue("phone", PHONE_PREFIX, { shouldValidate: false });
                }
              }}
              onBlur={(e) => {
                // If only the prefix was added but user typed nothing, clear it
                // so the placeholder reappears and validation shows the right state.
                if (e.target.value.trim() === PHONE_PREFIX.trim()) {
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
