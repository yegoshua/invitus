"use client";

import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { LabeledField } from "@/components/ui/labeled-field";
import LocationIcon from "@/public/assets/icons/checkout/location.svg";
import BoxIcon from "@/public/assets/icons/checkout/box.svg";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import {
  useNovaPoshtaCities,
  useNovaPoshtaBranches,
} from "@/hooks/use-nova-poshta";
import type { CheckoutFormData } from "@/lib/checkout-schema";

export function DeliveryFields() {
  const { control, setValue, watch } = useFormContext<CheckoutFormData>();
  const cityRef = watch("cityRef");

  // Local search state — separate from RHF "name" values because the user
  // types freely before committing a selection.
  const [cityQuery, setCityQuery] = useState(watch("cityName"));
  const [branchQuery, setBranchQuery] = useState(watch("branchName"));

  const cities = useNovaPoshtaCities(cityQuery);
  const branches = useNovaPoshtaBranches(cityRef || null, branchQuery);

  const cityOptions: SelectOption[] = cities.data.map((c) => ({
    value: c.ref,
    label: c.name,
    hint: c.areaDescription,
  }));

  const branchOptions: SelectOption[] = branches.data.map((w) => ({
    value: w.ref,
    label: w.description,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Controller
        name="cityRef"
        control={control}
        render={({ fieldState }) => (
          <LabeledField name="cityRef" label="Місто">
            {({ id, hintId, error }) => (
              <SearchableSelect
                id={id}
                icon={<LocationIcon />}
                placeholder="Почніть вводити місто"
                value={cityRef}
                query={cityQuery}
                onQueryChange={(q) => {
                  setCityQuery(q);
                  // Clear committed selection if user edits the text
                  if (cityRef) {
                    setValue("cityRef", "", { shouldValidate: false });
                    setValue("cityName", "", { shouldValidate: false });
                    setValue("branchRef", "", { shouldValidate: false });
                    setValue("branchName", "", { shouldValidate: false });
                    setBranchQuery("");
                  }
                }}
                onSelect={(option) => {
                  setValue("cityRef", option.value, { shouldValidate: true });
                  setValue("cityName", option.label, { shouldValidate: true });
                  setCityQuery(option.label);
                  // Reset branch when city changes
                  setValue("branchRef", "", { shouldValidate: false });
                  setValue("branchName", "", { shouldValidate: false });
                  setBranchQuery("");
                }}
                options={cityOptions}
                isLoading={cities.isLoading}
                invalid={!!error || !!fieldState.error}
                ariaDescribedBy={hintId}
              />
            )}
          </LabeledField>
        )}
      />

      <Controller
        name="branchRef"
        control={control}
        render={({ fieldState }) => (
          <LabeledField
            name="branchRef"
            label="Номер відділення або поштомату"
          >
            {({ id, hintId, error }) => (
              <SearchableSelect
                id={id}
                icon={<BoxIcon />}
                placeholder={
                  cityRef
                    ? "Введіть номер відділення або поштомату"
                    : "Спершу обери місто"
                }
                value={watch("branchRef")}
                query={branchQuery}
                onQueryChange={(q) => {
                  setBranchQuery(q);
                  if (watch("branchRef")) {
                    setValue("branchRef", "", { shouldValidate: false });
                    setValue("branchName", "", { shouldValidate: false });
                  }
                }}
                onSelect={(option) => {
                  setValue("branchRef", option.value, {
                    shouldValidate: true,
                  });
                  setValue("branchName", option.label, {
                    shouldValidate: true,
                  });
                  setBranchQuery(option.label);
                }}
                options={branchOptions}
                isLoading={branches.isLoading}
                disabled={!cityRef}
                invalid={!!error || !!fieldState.error}
                ariaDescribedBy={hintId}
              />
            )}
          </LabeledField>
        )}
      />

      {/* Mobile: 12/16 medium, 2% tracking, 8px from the input (gap-6 − mt-4).
          Desktop keeps the original 15px / 20px-gap look. */}
      <p className="text-xs leading-4 font-medium tracking-[0.02em] -mt-4 lg:text-[15px] lg:leading-normal lg:font-normal lg:tracking-normal lg:-mt-1 text-white/50">
        Доставляємо Новою поштою — тарифи оператора
      </p>
    </div>
  );
}
