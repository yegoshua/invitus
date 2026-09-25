import { formatPriceWithCurrency } from "@site/lib/format";
import type { SourceFigures } from "@/lib/finance/summary";

export function Sources({ sources, revenue }: { sources: SourceFigures[]; revenue: number }) {
  return (
    <section className="rounded-[26px] bg-card p-5 md:p-6" aria-labelledby="sources-title">
      <h2 id="sources-title" className="font-sans text-lg font-semibold">Джерела продажів</h2>
      {sources.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">У цьому періоді продажів ще немає</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {sources.map((s) => (
            <li key={s.sourceId}>
              <div className="flex items-baseline justify-between text-[15px]">
                <span>
                  {s.label} <span className="text-muted-foreground">· {s.sales}</span>
                </span>
                <span>{formatPriceWithCurrency(s.revenue)}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(s.revenue / revenue) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
