"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { IconInput } from "./icon-input";
import ChevronDownIcon from "@/public/assets/icons/checkout/chevron-down.svg";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchableSelectProps {
  id?: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (option: SelectOption) => void;
  options: SelectOption[];
  isLoading?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  emptyHint?: string;
  ariaDescribedBy?: string;
}

/**
 * Combobox-style searchable select. Click/focus opens, type filters, click an
 * item selects. Click outside or Escape closes. Up/Down/Enter for keyboard.
 */
export function SearchableSelect({
  id,
  icon,
  placeholder,
  query,
  onQueryChange,
  onSelect,
  options,
  isLoading,
  disabled,
  invalid,
  emptyHint = "Нічого не знайдено",
  ariaDescribedBy,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [rawIndex, setRawIndex] = useState(0);
  const [prevOptions, setPrevOptions] = useState(options);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived: when the options identity changes, reset the highlight to 0.
  // React-blessed "reset derived state on prop change" pattern (setState during render).
  if (prevOptions !== options) {
    setPrevOptions(options);
    setRawIndex(0);
  }

  const activeIndex =
    options.length === 0
      ? -1
      : Math.min(Math.max(rawIndex, 0), options.length - 1);

  // Outside click closes
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const handleSelect = (option: SelectOption) => {
    onSelect(option);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      data-state={open ? "open" : "closed"}
    >
      <IconInput
        id={id}
        ref={inputRef}
        icon={icon}
        trailing={
          isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ChevronDownIcon
              className={cn(
                "transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          )
        }
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        invalid={invalid}
        aria-expanded={open}
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-describedby={ariaDescribedBy}
        role="combobox"
        onFocus={() => !disabled && setOpen(true)}
        onChange={(e) => {
          onQueryChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) setOpen(true);
            setRawIndex((i) =>
              Math.min(
                (i < 0 ? 0 : i) + 1,
                Math.max(options.length - 1, 0)
              )
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setRawIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            if (open && activeIndex >= 0 && options[activeIndex]) {
              e.preventDefault();
              handleSelect(options[activeIndex]);
            }
          }
        }}
      />

      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+10px)] z-30",
            "bg-[var(--color-checkout-field)] rounded-[18px] p-2.5",
            "max-h-[268px] overflow-y-auto",
            "shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
          )}
        >
          {isLoading && options.length === 0 ? (
            <div className="px-4 py-3.5 text-[15px] text-white/50">
              Завантаження…
            </div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3.5 text-[15px] text-white/50">
              {emptyHint}
            </div>
          ) : (
            options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                onMouseEnter={() => setRawIndex(index)}
                className={cn(
                  "w-full text-left px-4 py-3.5 rounded-xl",
                  "text-[17px] font-medium text-white/92 cursor-pointer",
                  "transition-colors duration-100",
                  index === activeIndex && "bg-white/[0.07]"
                )}
              >
                <span>{option.label}</span>
                {option.hint && (
                  <span className="ml-2 text-[14px] text-white/50">
                    {option.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
