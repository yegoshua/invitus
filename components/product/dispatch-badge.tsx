import { cn } from "@/lib/utils";

/**
 * «Відправимо сьогодні» — the green pulsing dot over the product name.
 *
 * Drawn only while something can actually be dispatched: the caller passes
 * whether the product is in stock, and a sold-out page shows nothing rather
 * than a promise next to a dead button.
 */
export function DispatchBadge({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 font-sans text-xs lg:text-sm font-bold leading-4 lg:leading-5 tracking-[0.03em] uppercase text-[#2DB87A]",
        className
      )}
    >
      <span className="relative inline-flex size-4 shrink-0" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-[#2DB87A]/48 motion-safe:animate-ping motion-safe:[animation-duration:2.4s]" />
        <span className="absolute inset-0 rounded-full bg-[#2DB87A]/48" />
        <span className="absolute inset-[5px] rounded-full bg-[#2DB87A]" />
      </span>
      Відправимо сьогодні
    </p>
  );
}
