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
        "bg-surface rounded-[24px] lg:rounded-[32px]",
        "px-5 py-6 lg:px-12 lg:py-10",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6 lg:mb-10">
        <h2 className="font-heading font-bold text-base/6 tracking-[0.03em] lg:text-2xl/8 lg:tracking-[0.02em] text-white">
          {title}
        </h2>
        {headerSlot}
      </div>
      {children}
    </section>
  );
}
