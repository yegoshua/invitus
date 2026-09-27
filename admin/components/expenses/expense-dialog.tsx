"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { cn } from "@site/lib/utils";
import { removeExpense, saveExpense, type ExpenseFormState } from "@/app/(app)/expenses/actions";
import { adPlatformIn } from "@/lib/expenses/ad-warning";
import { MANUAL_CATEGORIES } from "@/lib/expenses/categories";
import type { ExpenseField } from "@/lib/expenses/input";

/** An Expense as the form edits it: every field a string, the amount as typed. */
export interface ExpenseDraft {
  id: number;
  title: string;
  amount: string;
  date: string;
  category: string;
  orderId: string;
  comment: string;
}

const field =
  "h-[52px] w-full min-w-0 rounded-[12px] border border-field bg-field px-4 text-base text-white outline-none focus:border-primary aria-invalid:border-[var(--color-error)]";
const labelText = "mb-3 block text-[15px] font-medium text-white/78";

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="mt-2 text-[13px] text-[var(--color-error)]">
      {text}
    </p>
  ) : null;
}

/**
 * "Нова витрата" / editing one. The dialog is a URL (`?add=1`, `?edit=<id>`),
 * so closing is navigating back to the journal and a reload keeps it open.
 * A modal on a desktop, a bottom sheet on a phone.
 */
export function ExpenseDialog({ expense, today, back }: { expense?: ExpenseDraft; today: string; back: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const closeHref = `/expenses${back ? `?${back}` : ""}`;
  const close = () => router.replace(closeHref, { scroll: false });

  const [saved, save, saving] = useActionState<ExpenseFormState, FormData>(saveExpense, {});
  const [removed, remove, removing] = useActionState<ExpenseFormState, FormData>(removeExpense, {});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Controlled, so a failed save keeps what was typed: React resets a form's
  // uncontrolled fields after every action.
  const [v, setV] = useState({
    title: expense?.title ?? "",
    amount: expense?.amount ?? "",
    date: expense?.date ?? today,
    category: expense?.category ?? "",
    orderId: expense?.orderId ?? "",
    comment: expense?.comment ?? "",
  });
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const errors = saved.errors ?? {};
  const message = removed.message ?? saved.message;
  const platform = adPlatformIn(v.title);
  const busy = saving || removing;
  const invalid = (f: ExpenseField) => (errors[f] ? { "aria-invalid": true, "aria-describedby": `${f}-error` } : {});

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="expense-title"
      className={cn(
        "fixed m-0 mt-auto max-h-[92svh] w-full max-w-none overflow-y-auto rounded-t-[26px] bg-card p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-foreground",
        "backdrop:bg-black/64 sm:m-auto sm:max-w-[480px] sm:rounded-[26px] sm:p-7"
      )}
    >
      <form action={save} className="flex flex-col gap-[22px]">
        <input type="hidden" name="back" value={back} />
        {expense && <input type="hidden" name="id" value={expense.id} />}

        <h2 id="expense-title" className="font-heading text-lg tracking-[0.03em] uppercase">
          {expense ? "Витрата" : "Нова витрата"}
        </h2>

        <label className="block">
          <span className={labelText}>Назва</span>
          <input name="title" value={v.title} onChange={set("title")} placeholder="Напр., пакування" maxLength={200} autoComplete="off" className={field} {...invalid("title")} />
          <FieldError id="title-error" text={errors.title} />
          {platform && (
            <p role="status" className="mt-2.5 flex gap-2 rounded-[12px] bg-primary/10 px-3 py-2.5 text-[13px] leading-snug text-white/90">
              <TriangleAlert className="mt-px size-4 shrink-0 text-primary" aria-hidden />
              Реклама {platform} рахується автоматично — не вноси її вручну, інакше вона задвоїться.
            </p>
          )}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className={labelText}>Сума, ₴</span>
            <input name="amount" value={v.amount} onChange={set("amount")} inputMode="decimal" placeholder="0" autoComplete="off" className={field} {...invalid("amount")} />
            <FieldError id="amount-error" text={errors.amount} />
          </label>
          <label className="block min-w-0">
            <span className={labelText}>Дата</span>
            <input type="date" name="date" value={v.date} onChange={set("date")} max={today} className={cn(field, "px-3.5 [color-scheme:dark]")} {...invalid("date")} />
            <FieldError id="date-error" text={errors.date} />
          </label>
        </div>

        <fieldset>
          <legend className={labelText}>Категорія</legend>
          <div className="flex flex-wrap gap-1.5">
            {MANUAL_CATEGORIES.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input type="radio" name="category" value={c.id} checked={v.category === c.id} onChange={set("category")} className="peer sr-only" />
                <span className="flex h-9 items-center rounded-[18px] border border-border px-3.5 text-sm font-medium text-[#D4D4D4] peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                  {c.label}
                </span>
              </label>
            ))}
          </div>
          <FieldError id="category-error" text={errors.category} />
        </fieldset>

        <label className="block">
          <span className={labelText}>
            № замовлення <span className="font-normal text-[#737373]">— необовʼязково</span>
          </span>
          <input name="orderId" value={v.orderId} onChange={set("orderId")} inputMode="numeric" placeholder="Напр., 1042 — для повернення чи відмови" autoComplete="off" className={field} {...invalid("orderId")} />
          <FieldError id="orderId-error" text={errors.orderId} />
        </label>

        <label className="block">
          <span className={labelText}>Коментар</span>
          <textarea name="comment" value={v.comment} onChange={set("comment")} rows={2} maxLength={1000} className={cn(field, "h-auto resize-y py-3.5")} {...invalid("comment")} />
          <FieldError id="comment-error" text={errors.comment} />
        </label>

        {message && (
          <p role="alert" className="rounded-[12px] border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2.5 text-[13px]">
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {expense && (
            <button
              type={confirmDelete ? "submit" : "button"}
              formAction={confirmDelete ? remove : undefined}
              onClick={(e) => {
                if (confirmDelete) return;
                // React re-renders this into a submit button before the click's
                // default action runs, so without this the first click deletes.
                e.preventDefault();
                setConfirmDelete(true);
              }}
              disabled={busy}
              className={cn(
                "mr-auto h-12 rounded-[14px] px-4 text-[15px] font-medium disabled:opacity-50",
                confirmDelete ? "bg-[var(--color-error)] text-white" : "text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
              )}
            >
              {removing ? "Видаляю…" : confirmDelete ? "Точно видалити" : "Видалити"}
            </button>
          )}
          <button type="button" onClick={close} className="h-12 rounded-[14px] border border-border px-5 text-[15px] font-medium hover:bg-field">
            Скасувати
          </button>
          <button disabled={busy} className="h-12 rounded-[14px] bg-primary px-6 text-[15px] font-semibold text-black hover:bg-[var(--color-coral-dark)] disabled:opacity-50">
            {saving ? "Зберігаю…" : "Зберегти"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
