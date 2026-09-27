import { Repeat } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/server";
import { categoryLabel } from "@/lib/expenses/categories";
import { dayLabel } from "@/lib/finance/format";
import { templateAmount } from "@/lib/recurring/currency";
import { cadenceLabel, nextDue } from "@/lib/recurring/schedule";
import { listRecurring, type RecurringExpense } from "@/lib/recurring/store";
import { RecurringDialog, type RecurringDraft } from "./recurring-dialog";

/** Minor units as the form shows them back: "2400", "30,84". */
function amountText(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2).replace(".", ",");
}

function draft(t: RecurringExpense): RecurringDraft {
  return {
    id: t.id,
    title: t.title,
    currency: t.currency,
    amount: amountText(t.amountMinor),
    category: t.category,
    cadence: t.cadence,
    dayOfMonth: String(t.dayOfMonth),
    month: t.month == null ? "" : String(t.month),
    startsOn: t.startsOn,
    endsOn: t.endsOn ?? "",
    comment: t.comment ?? "",
    paused: t.paused,
  };
}

function status(t: RecurringExpense, today: string): { text: string; muted: boolean } {
  if (t.paused) return { text: "призупинено", muted: true };
  const next = nextDue(t, t.generatedThrough, today);
  if (!next) return { text: "завершено", muted: true };
  return { text: next === today ? "сьогодні" : `наступний ${dayLabel(next)}${next.slice(0, 4) !== today.slice(0, 4) ? ` ${next.slice(0, 4)}` : ""}`, muted: false };
}

/**
 * «Регулярні платежі» on the Expenses page (#121): the templates the daily
 * cron turns into Expenses, and their dialog (`?recurring=new`,
 * `?recurring=<id>`). Loads its own data, so the page renders it from one place.
 */
export async function RecurringSection({ today, back, open }: { today: string; back: string; open?: string }) {
  await requireAdmin();
  const loaded = await listRecurring();
  const href = (value: string) => `/expenses?${new URLSearchParams([...new URLSearchParams(back), ["recurring", value]])}`;
  const templates = loaded.ok ? loaded.value : [];
  const editing = open && open !== "new" ? templates.find((t) => t.id === Number(open)) : undefined;

  return (
    <section className="flex min-w-0 flex-col rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="recurring-title">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id="recurring-title" className="font-sans text-[15px] font-medium text-white/78">Регулярні платежі</h2>
          <p className="text-[13px] text-[#737373]">
            Підписки й сервіси: у день списання зʼявляються в журналі самі. Доларові — за курсом НБУ того дня; фактичну суму можна виправити на самій витраті.
          </p>
        </div>
        {loaded.ok && (
          <Link href={href("new")} scroll={false} className="flex h-10 items-center rounded-[12px] border border-border px-4 text-sm font-medium whitespace-nowrap hover:bg-field">
            + Додати
          </Link>
        )}
      </div>

      {!loaded.ok && (
        <p className="border-t border-border py-5 text-sm text-[#737373]">
          {loaded.reason === "error" ? "Не вдалося завантажити — база даних не відповідає." : "База даних не підключена."}
        </p>
      )}
      {loaded.ok && templates.length === 0 && (
        <p className="border-t border-border py-5 text-sm text-[#737373]">Ще немає жодного — додай, напр., Strapi Cloud чи KeyCRM.</p>
      )}
      {templates.map((t) => {
        const s = status(t, today);
        return (
          <div key={t.id} className="border-t border-border">
          <Link
            href={href(String(t.id))}
            scroll={false}
            className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3 py-3.5 hover:bg-field"
          >
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className={`flex items-center gap-1.5 text-[15px] ${t.paused ? "text-[#737373]" : ""}`}>
                <Repeat className="size-3.5 shrink-0 text-[#737373]" aria-hidden />
                <span className="truncate">{t.title}</span>
              </span>
              <span className="text-[13px] text-[#737373]">
                {cadenceLabel(t)} · {categoryLabel(t.category)}
              </span>
            </span>
            <span className="flex flex-col items-end gap-[3px]">
              <span className={`text-[15px] font-semibold whitespace-nowrap ${t.paused ? "text-[#737373]" : ""}`}>{templateAmount(t.amountMinor, t.currency)}</span>
              <span className={`text-[13px] whitespace-nowrap ${s.muted ? "text-[#737373]" : "text-muted-foreground"}`}>{s.text}</span>
            </span>
          </Link>
          </div>
        );
      })}

      {loaded.ok && (open === "new" || editing) && (
        <RecurringDialog key={editing?.id ?? "new"} template={editing && draft(editing)} today={today} back={back} />
      )}
    </section>
  );
}
