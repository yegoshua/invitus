"use client";

import { useId } from "react";
import { useFormContext, type FieldError } from "react-hook-form";
import { cn } from "@/lib/utils";

interface LabeledFieldProps {
  name: string;
  label: string;
  children: (helpers: {
    id: string;
    hintId: string;
    error: FieldError | undefined;
  }) => React.ReactNode;
  className?: string;
}

export function LabeledField({
  name,
  label,
  children,
  className,
}: LabeledFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const ctx = useFormContext();
  const error = ctx?.formState?.errors?.[name] as FieldError | undefined;

  return (
    <div className={cn("relative flex flex-col", className)}>
      <label
        htmlFor={id}
        className="text-[15px] font-medium text-white/78 mb-3"
      >
        {label}
      </label>
      {children({ id, hintId, error })}
      {error?.message ? (
        <p
          id={hintId}
          role="alert"
          className="absolute left-0 right-0 top-full mt-1.5 text-sm text-[var(--color-error)] pointer-events-none"
        >
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
