import { cn } from "@/lib/utils";

interface ProductAttributesProps {
  items: string[];
  className?: string;
}

/** The bullet list that sits between the two rows of product photos. */
export function ProductAttributes({ items, className }: ProductAttributesProps) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-2 lg:gap-x-20 lg:gap-y-20 lg:px-[72px] lg:py-[72px]",
        className
      )}
    >
      {items.map((text) => (
        <li
          key={text}
          className="flex items-start gap-3 lg:gap-6 font-heading font-bold text-white text-base leading-6 tracking-[0.02em] lg:text-2xl lg:leading-8"
        >
          <span
            aria-hidden
            className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary lg:mt-[10px] lg:size-3"
          />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
