import { cn } from "@site/lib/utils";

export interface Kpi {
  label: string;
  value: string;
  /** The headline figure in coral — the design reserves it for Revenue. */
  accent?: boolean;
  /** Cumulative series for the sparkline; omitted when there is none. */
  spark?: number[];
  /** The sparkline's colour; coral unless given. */
  sparkColor?: string;
  delta?: { text: string; direction: -1 | 0 | 1 } | null;
  /** For costs, going up is not good news. */
  upIsGood?: boolean;
  vs?: string;
  note: string;
  /** No data source yet: the value is a dash and the card is quieter. */
  pending?: boolean;
}

function sparkPoints(values: number[]): string {
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  return values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(" ");
}

export function KpiCard({ label, value, accent, spark, sparkColor, delta, upIsGood = true, vs, note, pending }: Kpi) {
  const tone =
    !delta || delta.direction === 0 ? "text-muted-foreground" : (delta.direction > 0) === upIsGood ? "text-good" : "text-[var(--color-error)]";
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[26px] bg-card p-5 sm:p-6 dt:p-7">
      <p className="text-[15px] font-medium text-white/78">{label}</p>
      <p className={cn("text-[22px] leading-[1.1] font-semibold tracking-[-0.02em] whitespace-nowrap sm:text-[28px] dt:text-[32px]", accent && "text-primary", pending && "text-[#525252]")}>
        {value}
      </p>
      <div className="h-[30px]">
        {spark && spark.length > 1 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
            <polyline points={sparkPoints(spark)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="text-primary" style={sparkColor ? { color: sparkColor } : undefined} />
          </svg>
        )}
      </div>
      <div className="flex min-h-5 flex-wrap gap-x-1.5 gap-y-0.5 text-[13px]">
        {delta && <span className={cn("font-semibold whitespace-nowrap", tone)}>{delta.text}</span>}
        {delta && vs && <span className="whitespace-nowrap text-[#737373]">{vs}</span>}
      </div>
      <p className="mt-auto border-t border-border pt-2.5 text-[13px] leading-[1.4] text-pretty text-muted-foreground">{note}</p>
    </div>
  );
}
