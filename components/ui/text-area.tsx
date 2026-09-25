"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/**
 * The multi-line sibling of IconInput: the same field surface, border and
 * focus/error states, so a form that mixes the two reads as one form.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid, className, ...props },
  ref,
) {
  const isInvalid = invalid || props["aria-invalid"] === true;
  return (
    <textarea
      ref={ref}
      aria-invalid={isInvalid || undefined}
      className={cn(
        "min-h-24 px-5 py-4 text-white placeholder:text-white/40",
        "bg-[var(--color-checkout-field)]",
        "rounded-[var(--radius-checkout-field)]",
        "border-[1.5px] border-transparent outline-none",
        "transition-colors duration-150",
        "focus:border-coral",
        isInvalid && "border-[var(--color-error)]",
        className,
      )}
      {...props}
    />
  );
});
