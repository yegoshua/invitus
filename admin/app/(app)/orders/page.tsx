import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@site/lib/utils";
import { orderLink } from "@site/lib/order-notifications";
import { FeesBanner, KeyCrmDownBanner } from "@/components/data-banner";
import { ArrowUpRightIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/server";
import { loadFees } from "@/lib/fees/store";
import { dayLabel, plural, uah, uahExact } from "@/lib/finance/format";
import { orderRows, type OrderRow, type OrderStatusFilter } from "@/lib/finance/lists";
import { SOURCE_LABELS, STAGE_LABELS_ONE } from "@/lib/finance/orders";
import { PAYMENT_METHODS, paymentMethod } from "@/lib/finance/payments";
import { kyivDay, periodFromSearch } from "@/lib/finance/period";
import { loadOrders } from "@/lib/keycrm-orders";

export const metadata: Metadata = { title: "Замовлення" };

type Search = { period?: string; from?: string; to?: string; status?: string; source?: string; pay?: string };

const STATUSES: Array<[OrderStatusFilter, string]> = [
  ["sale", "Продаж"],
  ["open", "Відкрите"],
  ["stuck", "Застрягле"],
  ["cancelled", "Скасоване"],
];

function list(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function statusView(row: OrderRow): { label: string; dot: string; dim?: boolean } {
  if (row.cls.kind === "sale") return { label: "Продаж", dot: "#7EB693" };
  if (row.cls.kind === "cancelled") return { label: "Скасоване", dot: "#525252", dim: true };
  if (row.cls.stuck) return { label: "Застрягле", dot: "#E74223" };
  return { label: STAGE_LABELS_ONE[row.cls.stage], dot: "#A3A3A3" };
}

function paidView(row: OrderRow): string {
  if (row.cls.kind === "cancelled") return "—";
  if (row.order.paid) return "Оплачено";
  return paymentMethod(row.order.paymentMethodId)?.cod ? "Післяплата" : "Не оплачено";
}

function Fee({ row }: { row: OrderRow }) {
  const fee = row.fee;
  if (!fee) return <>—</>;
  // The bank's own figure is a plain number; only an estimate carries «≈».
  const estimated = fee.kind === "estimated";
  return (
    <span className="group/fee relative cursor-help whitespace-nowrap">
      {estimated && <span className="text-primary">≈&nbsp;</span>}
      {uahExact(fee.kop / 100)}
      <span className="pointer-events-none absolute right-0 bottom-[calc(100%+8px)] z-10 hidden rounded-[10px] border border-border bg-field px-2.5 py-2 text-xs whitespace-nowrap text-foreground group-hover/fee:block">
        {estimated ? `Оцінка: ${String(fee.percent).replace(".", ",")}% за способом оплати` : "Фактична комісія з виписки Monobank"}
      </span>
    </span>
  );
}

function Lines({ row, truncate }: { row: OrderRow; truncate?: boolean }) {
  if (row.order.lines.length === 0) return <span className="text-[#737373]">—</span>;
  return (
    <>
      {row.order.lines.map((l, i) => (
        <span key={i} className={cn(truncate && "truncate")}>
          {l.name}
          {l.quantity > 1 && <span className="text-[#737373]"> ×{l.quantity}</span>}
          {l.size && <span className="text-[#737373]"> · {l.size}</span>}
        </span>
      ))}
    </>
  );
}

const TABLE_COLS = "grid-cols-[64px_72px_92px_minmax(0,1fr)_92px_84px_136px_128px_28px]";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const now = new Date();
  const search = await searchParams;
  const { period, preset } = periodFromSearch(search, kyivDay(now));
  const filters = {
    status: list(search.status).filter((s): s is OrderStatusFilter => STATUSES.some(([k]) => k === s)),
    source: list(search.source).map(Number).filter(Number.isInteger),
    payment: list(search.pay).map(Number).filter(Number.isInteger),
  };
  const [data, fees] = await Promise.all([loadOrders(), loadFees()]);
  const rows = orderRows(data.orders, period, now, filters, fees);
  const total = rows.reduce((s, r) => s + r.order.total, 0);
  const hasFilters = filters.status.length + filters.source.length + filters.payment.length > 0;

  // Period params travel with every filter link, and filters with every period link.
  const periodParams: Record<string, string> = {};
  for (const k of ["period", "from", "to"] as const) if (search[k]) periodParams[k] = search[k]!;
  const filterParams: Record<string, string> = {};
  if (filters.status.length) filterParams.status = filters.status.join(",");
  if (filters.source.length) filterParams.source = filters.source.join(",");
  if (filters.payment.length) filterParams.pay = filters.payment.join(",");

  function toggle(group: "status" | "source" | "pay", value: string) {
    const current = group === "status" ? filters.status : (group === "source" ? filters.source : filters.payment).map(String);
    const next = current.includes(value as never) ? current.filter((v) => v !== value) : [...current, value];
    const params = new URLSearchParams({ ...periodParams, ...filterParams });
    if (next.length) params.set(group, next.join(","));
    else params.delete(group);
    return `?${params}`;
  }

  const groups = [
    { label: "Статус", group: "status" as const, chips: STATUSES.map(([k, l]) => ({ value: k, label: l, on: filters.status.includes(k) })) },
    {
      label: "Джерело",
      group: "source" as const,
      chips: Object.entries(SOURCE_LABELS).map(([k, l]) => ({ value: k, label: l, on: filters.source.includes(Number(k)) })),
    },
    {
      label: "Спосіб оплати",
      group: "pay" as const,
      chips: Object.entries(PAYMENT_METHODS)
        .filter(([k]) => k !== "1") // cash is not offered anywhere the Admin counts
        .map(([k, m]) => ({ value: k, label: m.label, on: filters.payment.includes(Number(k)) })),
    },
  ];

  return (
    <>
      <PageHeader title="Замовлення" period={period} preset={preset} keep={filterParams} />
      {!data.ok && <KeyCrmDownBanner />}
      <FeesBanner fees={fees} />

      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {groups.map((g) => (
          <div key={g.label} className="flex min-w-0 flex-col gap-2.5">
            <p className="text-[13px] text-[#737373]">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.chips.map((c) => (
                <Link
                  key={c.value}
                  href={toggle(g.group, c.value)}
                  aria-pressed={c.on}
                  scroll={false}
                  className={cn(
                    "flex h-[34px] items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                    c.on ? "border-foreground bg-foreground text-background" : "border-border text-[#D4D4D4] hover:border-[#404040]"
                  )}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="text-lg font-semibold">
          {rows.length} {plural(rows.length, "замовлення", "замовлення", "замовлень")} · {uah(total)}
        </p>
        {hasFilters && (
          <Link href={`?${new URLSearchParams(periodParams)}`} className="text-sm text-muted-foreground underline underline-offset-[3px] hover:text-foreground">
            Скинути фільтри
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[26px] bg-panel px-6 py-12 text-center text-[15px] text-muted-foreground">
          Немає замовлень за цими фільтрами в обраному періоді
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-[26px] bg-panel px-6 py-2 dt:block">
            <div className={cn("grid gap-3 py-3.5 text-[13px] text-[#737373]", TABLE_COLS)}>
              <span>№</span><span>Дата</span><span>Джерело</span><span>Товари</span>
              <span className="text-right">Сума</span><span className="text-right">Комісія</span>
              <span>Статус</span><span>Оплата</span><span />
            </div>
            {rows.map((row) => {
              const st = statusView(row);
              const href = orderLink(row.order.id);
              return (
                <div key={row.order.id} className={cn("grid items-center gap-3 border-t border-border py-3.5 text-sm", TABLE_COLS)}>
                  <span className="font-semibold">№{row.order.id}</span>
                  <span className="text-muted-foreground">{dayLabel(row.placedDay)}</span>
                  <span className="text-muted-foreground">{SOURCE_LABELS[row.order.sourceId] === "Новий сайт" ? "Сайт" : SOURCE_LABELS[row.order.sourceId] ?? "—"}</span>
                  <span className="flex min-w-0 flex-col gap-0.5"><Lines row={row} truncate /></span>
                  <span className="text-right font-semibold whitespace-nowrap">{uah(row.order.total)}</span>
                  <span className="text-right text-muted-foreground"><Fee row={row} /></span>
                  <span className={cn("flex items-center gap-2", st.dim && "text-[#737373]")}>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: st.dot }} />
                    {st.label}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span>{paidView(row)}</span>
                    <span className="truncate text-xs text-[#737373]">{paymentMethod(row.order.paymentMethodId)?.label ?? "—"}</span>
                  </span>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" title="Відкрити в KeyCRM" className="flex text-muted-foreground hover:text-primary">
                      <ArrowUpRightIcon />
                    </a>
                  ) : <span />}
                </div>
              );
            })}
          </div>

          {/* Tablet and phone cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 dt:hidden">
            {rows.map((row) => {
              const st = statusView(row);
              const href = orderLink(row.order.id);
              return (
                <div key={row.order.id} className="flex min-w-0 flex-col gap-3 rounded-[22px] bg-card p-[18px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="text-base font-semibold">№{row.order.id}</span>
                      <span className="text-[13px] whitespace-nowrap text-[#737373]">
                        {dayLabel(row.placedDay)} · {SOURCE_LABELS[row.order.sourceId] ?? "—"}
                      </span>
                    </div>
                    <span className="text-[17px] font-semibold whitespace-nowrap">{uah(row.order.total)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm"><Lines row={row} /></div>
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-border pt-3 text-[13px] text-muted-foreground">
                    <span className={cn("flex items-center gap-1.5 text-foreground", st.dim && "text-[#737373]")}>
                      <span className="size-[7px] rounded-full" style={{ background: st.dot }} />
                      {st.label}
                    </span>
                    <span>{paidView(row)} · {paymentMethod(row.order.paymentMethodId)?.label ?? "—"}</span>
                    <span>Комісія <Fee row={row} /></span>
                  </div>
                  {href && (
                    <a href={href} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-field text-sm font-medium hover:text-primary">
                      Відкрити в KeyCRM
                      <ArrowUpRightIcon size={16} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[#737373]">≈ — оцінка за ставкою способу оплати (ставки — на сторінці «Витрати»); без позначки — фактична комісія з виписки Monobank</p>
        </>
      )}
    </>
  );
}
