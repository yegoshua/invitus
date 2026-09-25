import { plural, uah } from "@/lib/finance/format";
import { SOURCE_LABELS } from "@/lib/finance/orders";
import type { SourceFigures } from "@/lib/finance/summary";

export function Sources({ sources, revenue }: { sources: SourceFigures[]; revenue: number }) {
  // Every known source is listed, sold or not: "Instagram — 0" is information.
  const rows = Object.entries(SOURCE_LABELS)
    .map(([id, label]) => sources.find((s) => s.sourceId === Number(id)) ?? { sourceId: Number(id), label, sales: 0, revenue: 0 })
    .concat(sources.filter((s) => !(s.sourceId in SOURCE_LABELS)))
    .sort((a, b) => b.revenue - a.revenue);
  return (
    <section style={{ gridArea: "src" }} className="flex min-w-0 flex-col gap-3.5 rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="src-title">
      <h2 id="src-title" className="font-sans text-[15px] font-medium text-white/78">Джерела продажів</h2>
      {rows.map((s) => (
        <div key={s.sourceId} className="flex flex-col gap-2">
          <div className="flex justify-between gap-3 text-[15px]">
            <span>{s.label}</span>
            <span>
              <span className="text-muted-foreground">
                {s.sales} {plural(s.sales, "продаж", "продажі", "продажів")}
              </span>
              <b className="ml-3 font-semibold">{uah(s.revenue)}</b>
            </span>
          </div>
          <div className="h-1.5 rounded-[3px] bg-field">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${revenue ? (s.revenue / revenue) * 100 : 0}%`, background: s.sourceId === 3 ? "#E74223" : "#737373" }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
