import Link from "next/link";
import { cn } from "@site/lib/utils";
import { PERIOD_PRESETS, type Period, type PeriodPreset } from "@/lib/finance/period";

/**
 * Plain links and a GET form: the period lives in the URL, so it survives a
 * reload, can be shared, and needs no client JavaScript.
 */
export function PeriodPicker({ active, period }: { active: PeriodPreset | "custom"; period: Period }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_PRESETS.map(({ id, label }) => (
        <Link
          key={id}
          href={`?period=${id}`}
          aria-current={active === id ? "true" : undefined}
          className={cn(
            "rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
            active === id && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground"
          )}
        >
          {label}
        </Link>
      ))}
      <form className="flex items-center gap-1 text-sm" aria-label="Свій період">
        <input
          type="date"
          name="from"
          defaultValue={period.from}
          aria-label="Від"
          className={cn("rounded-full border border-border bg-transparent px-3 py-1.5 [color-scheme:dark]", active === "custom" && "border-primary")}
        />
        <span className="text-muted-foreground">—</span>
        <input
          type="date"
          name="to"
          defaultValue={period.to}
          aria-label="До"
          className={cn("rounded-full border border-border bg-transparent px-3 py-1.5 [color-scheme:dark]", active === "custom" && "border-primary")}
        />
        <button className="rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground">OK</button>
      </form>
    </div>
  );
}
