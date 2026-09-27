"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { cn } from "@site/lib/utils";
import { pauseRecurring, removeRecurring, saveRecurring, type RecurringFormState } from "@/app/(app)/expenses/recurring-actions";
import { MANUAL_CATEGORIES } from "@/lib/expenses/categories";
import type { RecurringField } from "@/lib/recurring/input";

/** A template as the form edits it: every field a string. */
export interface RecurringDraft {
  id: number;
  title: string;
  currency: string;
  amount: string;
  category: string;
  cadence: string;
  dayOfMonth: string;
  month: string;
  startsOn: string;
  endsOn: string;
  comment: string;
  paused: boolean;
}

const MONTHS = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];

const field =
  "h-[52px] w-full min-w-0 rounded-[12px] border border-field bg-field px-4 text-base text-white outline-none focus:border-primary aria-invalid:border-[var(--color-error)]";
const labelText = "mb-3 block text-[15px] font-medium text-white/78";
const chip =
  "flex h-9 items-center rounded-[18px] border border-border px-3.5 text-sm font-medium text-[#D4D4D4] peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-primary";

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="mt-2 text-[13px] text-[var(--color-error)]">
      {text}
    </p>
  ) : null;
}

/**
 * «Новий регулярний платіж» / editing one. A URL like the Expense dialog
 * (`?recurring=new`, `?recurring=<id>`): a modal on a desktop, a bottom sheet
 * on a phone.
 */
export function RecurringDialog({ template, today, back }: { template?: RecurringDraft; today: string; back: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const closeHref = `/expenses${back ? `?${back}` : ""}`;
  const close = () => router.replace(closeHref, { scroll: false });

  const [saved, save, saving] = useActionState<RecurringFormState, FormData>(saveRecurring, {});
  const [removed, remove, removing] = useActionState<RecurringFormState, FormData>(removeRecurring, {});
  const [paused, pause, pausing] = useActionState<RecurringFormState, FormData>(pauseRecurring, {});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Controlled, so a failed save keeps what was typed.
  const [v, setV] = useState({
    title: template?.title ?? "",
    currency: template?.currency ?? "UAH",
    amount: template?.amount ?? "",
    category: template?.category ?? "services",
    cadence: template?.cadence ?? "monthly",
    dayOfMonth: template?.dayOfMonth ?? String(Number(today.slice(8))),
    month: template?.month ?? String(Number(today.slice(5, 7))),
    startsOn: template?.startsOn ?? today,
    endsOn: template?.endsOn ?? "",
    comment: template?.comment ?? "",
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const errors = saved.errors ?? {};
  const message = removed.message ?? paused.message ?? saved.message;
  const busy = saving || removing || pausing;
  const invalid = (f: RecurringField) => (errors[f] ? { "aria-invalid": true, "aria-describedby": `r-${f}-error` } : {});
  const yearly = v.cadence === "yearly";
  const day = Number(v.dayOfMonth);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="recurring-dialog-title"
      className={cn(
        "fixed m-0 mt-auto max-h-[92svh] w-full max-w-none overflow-y-auto rounded-t-[26px] bg-card p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-foreground",
        "backdrop:bg-black/64 sm:m-auto sm:max-w-[480px] sm:rounded-[26px] sm:p-7"
      )}
    >
      <form action={save} className="flex flex-col gap-[22px]">
        <input type="hidden" name="back" value={back} />
        {template && <input type="hidden" name="id" value={template.id} />}
        {template && <input type="hidden" name="paused" value={template.paused ? "0" : "1"} />}

        <div className="flex flex-col gap-1.5">
          <h2 id="recurring-dialog-title" className="font-heading text-lg tracking-[0.03em] uppercase">
            {template ? "Регулярний платіж" : "Новий регулярний платіж"}
          </h2>
          {template?.paused && <p className="text-[13px] text-[#737373]">Призупинено — нові витрати не створюються.</p>}
        </div>

        <label className="block">
          <span className={labelText}>Назва</span>
          <input name="title" value={v.title} onChange={set("title")} placeholder="Напр., Strapi Cloud" maxLength={200} autoComplete="off" className={field} {...invalid("title")} />
          <FieldError id="r-title-error" text={errors.title} />
        </label>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <label className="block min-w-0">
            <span className={labelText}>Сума</span>
            <input name="amount" value={v.amount} onChange={set("amount")} inputMode="decimal" placeholder="0" autoComplete="off" className={field} {...invalid("amount")} />
          </label>
          <fieldset className="min-w-0">
            <legend className={labelText}>Валюта</legend>
            <div className="flex h-[52px] items-center gap-1.5">
              {[
                { id: "UAH", label: "₴ грн" },
                { id: "USD", label: "$ USD" },
              ].map((c) => (
                <label key={c.id} className="cursor-pointer">
                  <input type="radio" name="currency" value={c.id} checked={v.currency === c.id} onChange={set("currency")} className="peer sr-only" />
                  <span className={chip}>{c.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {(errors.amount || errors.currency) && <FieldError id="r-amount-error" text={errors.amount ?? errors.currency} />}
        {v.currency === "USD" && !errors.amount && (
          <p className="-mt-3 text-[13px] text-[#737373]">Витрата буде в гривнях за курсом НБУ на день списання.</p>
        )}

        <fieldset>
          <legend className={labelText}>Як часто</legend>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "monthly", label: "Щомісяця" },
              { id: "yearly", label: "Щороку" },
            ].map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input type="radio" name="cadence" value={c.id} checked={v.cadence === c.id} onChange={set("cadence")} className="peer sr-only" />
                <span className={chip}>{c.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="r-cadence-error" text={errors.cadence} />
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className={labelText}>День списання</span>
            <input name="dayOfMonth" value={v.dayOfMonth} onChange={set("dayOfMonth")} inputMode="numeric" maxLength={2} autoComplete="off" className={field} {...invalid("dayOfMonth")} />
          </label>
          {yearly && (
            <label className="block min-w-0">
              <span className={labelText}>Місяць</span>
              <select name="month" value={v.month} onChange={set("month")} className={cn(field, "px-3.5 [color-scheme:dark]")} {...invalid("month")}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <FieldError id="r-dayOfMonth-error" text={errors.dayOfMonth ?? errors.month} />
        {!yearly && day >= 29 && day <= 31 && !errors.dayOfMonth && (
          <p className="-mt-3 text-[13px] text-[#737373]">У коротших місяцях — останнього дня місяця.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className={labelText}>Початок</span>
            <input type="date" name="startsOn" value={v.startsOn} onChange={set("startsOn")} className={cn(field, "px-3.5 [color-scheme:dark]")} {...invalid("startsOn")} />
            <FieldError id="r-startsOn-error" text={errors.startsOn} />
          </label>
          <label className="block min-w-0">
            <span className={labelText}>
              Кінець <span className="font-normal text-[#737373]">— необовʼязково</span>
            </span>
            <input type="date" name="endsOn" value={v.endsOn} onChange={set("endsOn")} min={v.startsOn} className={cn(field, "px-3.5 [color-scheme:dark]")} {...invalid("endsOn")} />
            <FieldError id="r-endsOn-error" text={errors.endsOn} />
          </label>
        </div>

        <fieldset>
          <legend className={labelText}>Категорія</legend>
          <div className="flex flex-wrap gap-1.5">
            {MANUAL_CATEGORIES.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input type="radio" name="category" value={c.id} checked={v.category === c.id} onChange={set("category")} className="peer sr-only" />
                <span className={chip}>{c.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="r-category-error" text={errors.category} />
        </fieldset>

        <label className="block">
          <span className={labelText}>Коментар</span>
          <textarea name="comment" value={v.comment} onChange={set("comment")} rows={2} maxLength={1000} className={cn(field, "h-auto resize-y py-3.5")} {...invalid("comment")} />
          <FieldError id="r-comment-error" text={errors.comment} />
        </label>

        {template && (
          <p className="text-[13px] text-[#737373]">Зміни діють на наступні списання. Витрати, що вже в журналі, лишаються як є.</p>
        )}

        {message && (
          <p role="alert" className="rounded-[12px] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2.5 text-[13px]">
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {template && (
            <div className="mr-auto flex flex-wrap gap-1">
              <button
                type={confirmDelete ? "submit" : "button"}
                formAction={confirmDelete ? remove : undefined}
                onClick={(e) => {
                  if (confirmDelete) return;
                  // As in the Expense dialog: without this the first click deletes.
                  e.preventDefault();
                  setConfirmDelete(true);
                }}
                disabled={busy}
                className={cn(
                  "h-12 rounded-[14px] px-4 text-[15px] font-medium disabled:opacity-50",
                  confirmDelete ? "bg-[var(--color-error)] text-white" : "text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
                )}
              >
                {removing ? "Видаляю…" : confirmDelete ? "Точно видалити" : "Видалити"}
              </button>
              <button formAction={pause} disabled={busy} className="h-12 rounded-[14px] px-4 text-[15px] font-medium hover:bg-field disabled:opacity-50">
                {pausing ? "Зберігаю…" : template.paused ? "Відновити" : "Призупинити"}
              </button>
            </div>
          )}
          <button type="button" onClick={close} className="h-12 rounded-[14px] border border-border px-5 text-[15px] font-medium hover:bg-field">
            Скасувати
          </button>
          <button disabled={busy} className="h-12 rounded-[14px] bg-primary px-6 text-[15px] font-semibold text-black hover:bg-[var(--color-coral-dark)] disabled:opacity-50">
            {saving ? "Зберігаю…" : "Зберегти"}
          </button>
        </div>
        {confirmDelete && (
          <p className="-mt-2 text-[13px] text-[#737373]">Витрати, які платіж уже створив, залишаться в журналі.</p>
        )}
      </form>
    </dialog>
  );
}
