import { cn } from "@/lib/utils";

interface CheckoutFormSectionProps {
  title: string;
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function CheckoutFormSection({
  title,
  headerSlot,
  children,
  className,
}: CheckoutFormSectionProps) {
  return (
    <section
      className={cn(
        "bg-surface rounded-[var(--radius-checkout-card)]",
        "p-8 sm:p-10 lg:px-12 lg:py-11",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6 lg:mb-10">
        <h2 className="font-heading text-2xl lg:text-[30px] text-white">
          {title}
        </h2>
        {headerSlot}
      </div>
      {children}
    </section>
  );
}
