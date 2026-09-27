import Link from "next/link";
import { cn } from "@site/lib/utils";
import { rangeLabel } from "@/lib/finance/format";
import { PERIOD_PRESETS, previousPeriod, type Period, type PeriodPreset } from "@/lib/finance/period";

/**
 * Title, the period in words, and the period switch. The switch is links and
 * a GET form: the period lives in the URL, survives a reload and is shareable.
 */
export function PageHeader({
  title,
  period,
  preset,
  action,
  keep = {},
}: {
  title: string;
  period: Period;
  preset: PeriodPreset | "custom";
  action?: React.ReactNode;
  /** Other query params a period change should keep (the Orders filters). */
  keep?: Record<string, string>;
}) {
  const href = (params: Record<string, string>) => `?${new URLSearchParams({ ...keep, ...params })}`;
  const segment = "flex h-[34px] shrink-0 items-center rounded-[10px] px-3.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground";
  const active = "bg-[#262626] text-foreground";

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="m-0 font-heading text-[26px] leading-[1.1] tracking-[0.02em] text-white uppercase sm:text-[32px] dt:text-[36px]">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {rangeLabel(period)} · порівняння з {rangeLabel(previousPeriod(period))}
        </p>
      </div>
      <div className="flex max-w-full flex-wrap items-center gap-3">
        <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-[14px] border border-border bg-panel p-1 scrollbar-hide">
          {PERIOD_PRESETS.map(({ id, label }) => (
            <Link key={id} href={href({ period: id })} aria-current={preset === id ? "true" : undefined} className={cn(segment, preset === id && active)}>
              {label}
            </Link>
          ))}
          <details className="group relative">
            <summary className={cn(segment, "cursor-pointer list-none [&::-webkit-details-marker]:hidden", preset === "custom" && active)}>
              {preset === "custom" ? rangeLabel(period) : "Свій період"}
            </summary>
            <form className="fixed right-4 z-30 mt-2 flex w-64 flex-col gap-3 rounded-[16px] border border-border bg-field p-4 shadow-2xl sm:right-12">
              {Object.entries(keep).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
                Від
                <input type="date" name="from" defaultValue={period.from} required className="h-11 rounded-[12px] border border-border bg-background px-3 text-[15px] text-foreground [color-scheme:dark] focus:border-primary focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
                До
                <input type="date" name="to" defaultValue={period.to} required className="h-11 rounded-[12px] border border-border bg-background px-3 text-[15px] text-foreground [color-scheme:dark] focus:border-primary focus:outline-none" />
              </label>
              <button className="h-11 rounded-[12px] bg-primary text-[15px] font-semibold text-black hover:bg-[var(--color-coral-dark)]">Показати</button>
            </form>
          </details>
        </div>
        {action}
      </div>
    </header>
  );
}
