import { ArrowUpRight, CircleCheck } from "lucide-react";
import { formatPriceWithCurrency } from "@site/lib/format";
import { orderLink } from "@site/lib/order-notifications";
import { STUCK_REASON_LABELS } from "@/lib/finance/orders";
import type { StuckOrder } from "@/lib/finance/summary";

function days(n: number): string {
  const tens = n % 100, ones = n % 10;
  if (tens >= 11 && tens <= 14) return `${n} днів`;
  if (ones === 1) return `${n} день`;
  if (ones >= 2 && ones <= 4) return `${n} дні`;
  return `${n} днів`;
}

export function StuckOrders({ orders }: { orders: StuckOrder[] }) {
  const total = orders.reduce((sum, o) => sum + o.total, 0);
  return (
    <section className="rounded-[26px] bg-card p-5 md:p-6" aria-labelledby="stuck-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="stuck-title" className="font-sans text-lg font-semibold">Потребують закриття</h2>
        {orders.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {orders.length} · {formatPriceWithCurrency(total)}
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Фактично завершені, але в KeyCRM не доведені до «виконано + оплачено». Поки не закриті, їх немає у виручці.
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-emerald-400/90" aria-hidden /> Усе закрито
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {orders.map((o) => {
            const href = orderLink(o.id);
            const row = (
              <>
                <span className="w-14 shrink-0 text-sm text-muted-foreground">№{o.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{STUCK_REASON_LABELS[o.reason]}</span>
                  <span className="block text-sm text-muted-foreground">
                    {o.sourceLabel} · висить {days(o.days)}
                  </span>
                </span>
                <span className="shrink-0 text-[15px]">{formatPriceWithCurrency(o.total)}</span>
                {href && <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
              </>
            );
            return (
              <li key={o.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="-mx-2 flex items-center gap-3 rounded-[12px] px-2 py-3 hover:bg-secondary">
                    {row}
                  </a>
                ) : (
                  <div className="flex items-center gap-3 py-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
