import { orderLink } from "@site/lib/order-notifications";
import { ArrowUpRightIcon } from "@/components/icons";
import { plural, uah } from "@/lib/finance/format";
import { STUCK_REASON_LABELS } from "@/lib/finance/orders";
import type { StuckOrder } from "@/lib/finance/summary";

export function StuckOrders({ orders }: { orders: StuckOrder[] }) {
  const total = orders.reduce((sum, o) => sum + o.total, 0);
  return (
    <section style={{ gridArea: "close" }} className="flex min-w-0 flex-col rounded-[26px] border border-primary/55 bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="stuck-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <h2 id="stuck-title" className="flex items-center gap-2 font-sans text-[15px] font-medium text-white/78">
            <span className="size-2 rounded-full bg-primary" />
            Потребують закриття
          </h2>
          <p className="text-2xl font-semibold tracking-[-0.01em]">
            {orders.length} {plural(orders.length, "замовлення", "замовлення", "замовлень")} · {uah(total)}
          </p>
        </div>
        <p className="max-w-60 text-[13px] leading-[1.4] text-[#737373]">Фактично завершились, але в KeyCRM ще не закриті</p>
      </div>
      {orders.length === 0 ? (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">Усе закрито ✓</p>
      ) : (
        orders.map((o) => {
          const href = orderLink(o.id);
          const Row = href ? "a" : "div";
          return (
            <Row
              key={o.id}
              {...(href ? { href, target: "_blank", rel: "noreferrer", title: "Відкрити в KeyCRM" } : {})}
              className="group grid grid-cols-[minmax(0,1fr)_auto_auto_20px] items-center gap-3 border-t border-border py-3.5 text-foreground"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">№{o.id}</span>
                <span className="text-sm text-pretty text-muted-foreground">
                  {STUCK_REASON_LABELS[o.reason]} · {o.sourceLabel}
                </span>
              </span>
              <span className="text-[15px] font-semibold whitespace-nowrap">{uah(o.total)}</span>
              <span className="rounded-lg bg-field px-2 py-1 text-[13px] font-medium whitespace-nowrap">
                {o.days} {plural(o.days, "день", "дні", "днів")}
              </span>
              {href ? <ArrowUpRightIcon className="text-muted-foreground group-hover:text-primary" /> : <span />}
            </Row>
          );
        })
      )}
    </section>
  );
}
