import type { Metadata } from "next";
import { Lock } from "lucide-react";
import Link from "next/link";
import { AdSpendBanner, DatabaseDownBanner, FeesBanner, KeyCrmDownBanner } from "@/components/data-banner";
import { ExpenseDialog, type ExpenseDraft } from "@/components/expenses/expense-dialog";
import { FeeRatesForm } from "@/components/expenses/fee-rates-form";
import { KpiCard } from "@/components/overview/kpi-card";
import { PageHeader } from "@/components/page-header";
import { PendingPanel } from "@/components/pending-panel";
import { requireAdmin } from "@/lib/auth/server";
import { categoryLabel } from "@/lib/expenses/categories";
import { listExpenses, type Expense } from "@/lib/expenses/store";
import { loadFees } from "@/lib/fees/store";
import { summarizeExpenses } from "@/lib/finance/expenses";
import { periodFees } from "@/lib/finance/fees";
import { dayLabel, deltaLabel, plural, rangeLabel, uah, uahExact } from "@/lib/finance/format";
import { PAYMENT_METHODS, RATED_METHOD_IDS } from "@/lib/finance/payments";
import { kyivDay, periodFromSearch, previousPeriod } from "@/lib/finance/period";
import { loadFreshness } from "@/lib/ingest/store";
import { loadOrders } from "@/lib/keycrm-orders";

export const metadata: Metadata = { title: "Витрати" };

type Search = { period?: string; from?: string; to?: string; add?: string; edit?: string };

/** Kopecks as the form shows them back: "2400", "1250,50". */
function amountText(kop: number): string {
  return kop % 100 === 0 ? String(kop / 100) : (kop / 100).toFixed(2).replace(".", ",");
}

function draft(e: Expense): ExpenseDraft {
  return {
    id: e.id,
    title: e.title,
    amount: amountText(e.amountKop),
    date: e.date,
    category: e.category,
    orderId: e.orderId == null ? "" : String(e.orderId),
    comment: e.comment ?? "",
  };
}

const TIME = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Entry({ e, editHref }: { e: Expense; editHref: string }) {
  const manual = e.source === "manual";
  const meta = [
    categoryLabel(e.category, e.source),
    e.orderId != null && `№${e.orderId}`,
    manual && e.authorName && `${e.authorName}, ${TIME.format(e.createdAt)}`,
    manual && e.editorName && `змінив(ла) ${e.editorName}, ${TIME.format(e.updatedAt)}`,
  ].filter(Boolean);
  const body = (
    <>
      <span className="flex min-w-0 flex-col gap-[3px]">
        <span className="flex items-center gap-1.5 text-[15px]">
          {!manual && <Lock className="size-3.5 shrink-0 text-[#737373]" aria-label="Автоматичний запис" />}
          <span className="truncate">{e.title}</span>
        </span>
        <span className="text-[13px] text-[#737373]">{meta.join(" · ")}</span>
        {e.comment && <span className="text-[13px] text-muted-foreground">{e.comment}</span>}
      </span>
      <span className="text-[15px] font-semibold whitespace-nowrap">{uahExact(e.amountKop / 100)}</span>
    </>
  );
  const row = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5";
  return manual ? (
    <Link href={editHref} scroll={false} className={`${row} -mx-3 rounded-[14px] px-3 hover:bg-field`}>
      {body}
    </Link>
  ) : (
    <div className={row} title="Реклама підтягується автоматично і не редагується">
      {body}
    </div>
  );
}

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const search = await searchParams;
  const now = new Date();
  const today = kyivDay(now);
  const { period, preset } = periodFromSearch(search, today);

  // The period's own query, kept by every link on the page and by the form.
  const back = new URLSearchParams(
    Object.entries({ period: search.period, from: search.from, to: search.to }).filter((e): e is [string, string] => !!e[1])
  ).toString();
  const withParam = (k: string, v: string) => `/expenses?${new URLSearchParams([...new URLSearchParams(back), [k, v]])}`;

  const [loaded, orders, feeData, meta] = await Promise.all([
    listExpenses(previousPeriod(period).from, period.to),
    loadOrders(),
    loadFees(),
    loadFreshness("meta"),
  ]);
  const fees = periodFees(orders.orders, feeData.actual, feeData.rates, period, now);
  const feesKnown = orders.ok && feeData.ok;
  const all = loaded.ok ? loaded.value : [];
  const s = summarizeExpenses(all, period);
  const entries = all.filter((e) => e.date >= period.from);
  const days = [...new Set(entries.map((e) => e.date))];
  const editing = search.edit ? all.find((e) => e.id === Number(search.edit) && e.source === "manual") : undefined;
  const manualCount = entries.filter((e) => e.source === "manual").length;

  const addButton = (className: string) =>
    loaded.ok ? (
      <Link href={withParam("add", "1")} scroll={false} className={className}>
        + Додати витрату
      </Link>
    ) : null;

  return (
    <>
      <PageHeader
        title="Витрати"
        period={period}
        preset={preset}
        action={addButton(
          "hidden h-11 items-center rounded-[14px] bg-primary px-5 text-[15px] font-semibold whitespace-nowrap text-black hover:bg-[var(--color-coral-dark)] sm:flex"
        )}
      />
      {!loaded.ok && loaded.reason === "error" && <DatabaseDownBanner />}
      {loaded.ok && !orders.ok && <KeyCrmDownBanner />}
      {loaded.ok && <FeesBanner fees={feeData} />}
      {loaded.ok && <AdSpendBanner meta={meta} />}

      {!loaded.ok && loaded.reason === "unconfigured" ? (
        <PendingPanel title="Журнал витрат">
          Адмінці ще не підключена база даних (немає <code>ADMIN_DB_DATABASE_URL</code>). Підключи Neon у Vercel — проєкт invitus-admin → Storage — і
          застосуй міграції: <code>pnpm --filter invitus-admin db:migrate --apply</code>.
        </PendingPanel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 dt:grid-cols-4">
            <KpiCard
              label="Усього витрат"
              value={loaded.ok ? uah(s.total) : "—"}
              pending={!loaded.ok}
              delta={loaded.ok ? deltaLabel(s.total, s.previousTotal) : null}
              upIsGood={false}
              vs={`до ${rangeLabel(previousPeriod(period))}`}
              note="Без комісій за оплату — вони окремо"
            />
            <KpiCard
              label="Реклама"
              value={loaded.ok && s.ads > 0 ? uah(s.ads) : "—"}
              pending={!loaded.ok || s.ads === 0}
              delta={loaded.ok && s.ads > 0 ? deltaLabel(s.ads, s.previousAds) : null}
              upIsGood={false}
              vs={`до ${rangeLabel(previousPeriod(period))}`}
              note={
                s.ads > 0
                  ? `${Math.round((s.ads / s.total) * 100)}% від усіх витрат · Meta, автоматично`
                  : meta?.asOf
                    ? "Meta, автоматично — у цьому періоді реклама не крутилась"
                    : "Meta, автоматично — після підключення"
              }
            />
            <KpiCard
              label="Комісії"
              value={feesKnown ? `${fees.estimated > 0 ? "≈ " : ""}${uah(fees.total)}` : "—"}
              pending={!feesKnown}
              delta={feesKnown ? deltaLabel(fees.total, fees.previousTotal) : null}
              upIsGood={false}
              vs={`до ${rangeLabel(previousPeriod(period))}`}
              note={
                !feesKnown
                  ? "Не завантажились — див. банер вище"
                  : fees.estimated === 0
                    ? "Фактичні, з виписки Monobank"
                    : fees.actual === 0
                      ? "Оцінка за ставками нижче"
                      : `Факт ${uah(fees.actual)} · оцінка ${uah(fees.estimated)}`
              }
            />
            <KpiCard
              label="Інші витрати"
              value={loaded.ok ? uah(s.manual) : "—"}
              pending={!loaded.ok}
              note={`${manualCount} ${plural(manualCount, "запис", "записи", "записів")} вручну`}
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 dt:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <section className="flex min-w-0 flex-col gap-4 rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="cat-title">
              <h2 id="cat-title" className="font-sans text-[15px] font-medium text-white/78">За категоріями</h2>
              {s.byCategory.length === 0 && <p className="text-sm text-[#737373]">У цьому періоді витрат ще немає.</p>}
              {s.byCategory.map((c, i) => (
                <div key={c.category} className="flex flex-col gap-2">
                  <div className="flex justify-between gap-3 text-[15px]">
                    <span>
                      {c.category === "ads" ? "Реклама Meta і Google" : categoryLabel(c.category)}{" "}
                      <span className="text-xs text-[#737373]">
                        {c.category === "ads" ? "авто" : `${Math.round((c.total / s.total) * 100)}%`}
                      </span>
                    </span>
                    <b className="font-semibold whitespace-nowrap">{uah(c.total)}</b>
                  </div>
                  <div className="h-1.5 rounded-[3px] bg-field">
                    <div
                      className="h-full rounded-[3px]"
                      style={{ width: `${Math.max(1, (c.total / s.total) * 100)}%`, background: i === 0 ? "#A3A3A3" : "#525252" }}
                    />
                  </div>
                </div>
              ))}
            </section>

            <section className="flex min-w-0 flex-col rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="log-title">
              <div className="mb-2 flex flex-wrap justify-between gap-x-3 gap-y-1.5">
                <h2 id="log-title" className="font-sans text-[15px] font-medium text-white/78">Журнал</h2>
                <span className="text-[13px] text-[#737373]">Реклама підтягується автоматично і не редагується</span>
              </div>
              {entries.length === 0 && (
                <p className="border-t border-border py-7 text-sm text-[#737373]">За цей період витрат немає.</p>
              )}
              {days.map((day) => {
                const dayEntries = entries.filter((e) => e.date === day);
                const total = dayEntries.reduce((n, e) => n + e.amountKop, 0);
                return (
                  <div key={day} className="border-t border-border pt-3">
                    <div className="flex justify-between text-[13px] text-muted-foreground">
                      <span>{dayLabel(day)}</span>
                      <span>{uahExact(total / 100)}</span>
                    </div>
                    {dayEntries.map((e) => (
                      <Entry key={e.id} e={e} editHref={withParam("edit", String(e.id))} />
                    ))}
                  </div>
                );
              })}
            </section>
          </div>

          {loaded.ok && (
            <section className="flex min-w-0 flex-col gap-4 rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="rates-title">
              <div className="flex flex-col gap-1.5">
                <h2 id="rates-title" className="font-sans text-[15px] font-medium text-white/78">Ставки комісій</h2>
                <p className="text-[13px] text-[#737373]">
                  Відсоток від суми замовлення, який утримує банк чи перевізник. З нього рахується оцінка «≈» там, де фактичної
                  комісії з виписки Monobank немає.
                </p>
              </div>
              <FeeRatesForm
                methods={RATED_METHOD_IDS.map((id) => ({ id, label: PAYMENT_METHODS[id].label, percent: feeData.rates[id] ?? 0 }))}
              />
            </section>
          )}
        </>
      )}

      {/* Phone: the add button floats above the tab bar, and the journal's
          last row needs room to scroll out from under it. */}
      {loaded.ok && <div aria-hidden className="h-14 sm:hidden" />}
      {addButton(
        "fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-10 flex h-12 items-center rounded-[16px] bg-primary px-5 text-[15px] font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,0.5)] sm:hidden"
      )}

      {loaded.ok && (search.add || editing) && (
        <ExpenseDialog key={editing?.id ?? "new"} expense={editing && draft(editing)} today={today} back={back} />
      )}
    </>
  );
}
