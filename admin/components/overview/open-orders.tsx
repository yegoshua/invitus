import { plural, uah } from "@/lib/finance/format";
import { STAGE_LABELS, type OpenStage } from "@/lib/finance/orders";
import type { PeriodSummary } from "@/lib/finance/summary";

const ORDER = Object.keys(STAGE_LABELS) as OpenStage[];
// Coral fading out along the pipeline, as in the design.
const COLORS = ["#E74223", "rgba(231,66,35,0.75)", "rgba(231,66,35,0.55)", "rgba(231,66,35,0.38)", "rgba(231,66,35,0.22)"];

export function OpenOrders({ open }: { open: PeriodSummary["open"] }) {
  const stages = [...open.byStage].sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));
  const color = (stage: OpenStage) => COLORS[ORDER.indexOf(stage)];
  return (
    <section style={{ gridArea: "open" }} className="flex min-w-0 flex-col gap-4 rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="open-title">
      <div className="flex flex-col gap-1.5">
        <h2 id="open-title" className="font-sans text-[15px] font-medium text-white/78">Відкриті замовлення</h2>
        <p className="text-2xl font-semibold tracking-[-0.01em]">
          {open.count} в роботі · {uah(open.total)}
        </p>
      </div>
      {stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Відкритих замовлень немає</p>
      ) : (
        <>
          <div className="flex h-2 gap-[3px]">
            {stages.map((s) => (
              <div key={s.stage} className="basis-0 rounded" style={{ flexGrow: s.count, background: color(s.stage) }} />
            ))}
          </div>
          <div className="flex flex-col">
            {stages.map((s) => (
              <div key={s.stage} className="grid grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-2.5 py-2 text-[15px]">
                <span className="size-2 rounded-full" style={{ background: color(s.stage) }} />
                <span className="text-muted-foreground">{STAGE_LABELS[s.stage]}</span>
                <span className="min-w-6 text-right font-semibold" aria-label={`${s.count} ${plural(s.count, "замовлення", "замовлення", "замовлень")}`}>
                  {s.count}
                </span>
                <span className="min-w-[88px] text-right">{uah(s.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
