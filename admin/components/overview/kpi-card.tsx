import { cn } from "@site/lib/utils";

function formatDelta(value: number): string {
  const pct = Math.round(value * 100);
  return `${pct > 0 ? "↑" : pct < 0 ? "↓" : ""}${Math.abs(pct)}%`;
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <div className="rounded-[26px] bg-card p-5 md:p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-tight md:text-[32px]">{value}</p>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-sm">
        {delta != null && (
          <span
            title="Порівняно з попереднім періодом такої ж довжини"
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              delta > 0 && "bg-emerald-500/10 text-emerald-400/90",
              delta < 0 && "bg-[var(--color-error)]/10 text-[var(--color-error)]",
              delta === 0 && "bg-secondary text-muted-foreground"
            )}
          >
            {formatDelta(delta)}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
