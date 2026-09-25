import { formatPriceWithCurrency } from "@site/lib/format";
import { STAGE_LABELS, type OpenStage } from "@/lib/finance/orders";
import type { PeriodSummary } from "@/lib/finance/summary";

const ORDER = Object.keys(STAGE_LABELS) as OpenStage[];

export function OpenOrders({ open }: { open: PeriodSummary["open"] }) {
  const stages = [...open.byStage].sort((a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage));
  return (
    <section className="rounded-[26px] bg-card p-5 md:p-6" aria-labelledby="open-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="open-title" className="font-sans text-lg font-semibold">Відкриті замовлення</h2>
        <p className="text-sm text-muted-foreground">
          {open.count} · {formatPriceWithCurrency(open.total)}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Зараз у роботі. У виручку потраплять, коли стануть продажем.</p>
      {stages.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Відкритих замовлень немає</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {stages.map((s) => (
            <li key={s.stage} className="flex items-center justify-between text-[15px]">
              <span>
                {STAGE_LABELS[s.stage]} <span className="text-muted-foreground">· {s.count}</span>
              </span>
              <span>{formatPriceWithCurrency(s.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
