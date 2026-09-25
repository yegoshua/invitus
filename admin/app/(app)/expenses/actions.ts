"use server";

// The only writes the Admin makes. Each one checks the session itself — a
// Server Action is a public POST endpoint, and the proxy is not the authority
// on it (ADR 0002) — and validates on the server, whatever the form did.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { parseExpenseInput, type ExpenseField } from "@/lib/expenses/input";
import { createExpense, deleteExpense, updateExpense } from "@/lib/expenses/store";
import { kyivDay } from "@/lib/finance/period";

export type ExpenseFormState = {
  errors?: Partial<Record<ExpenseField, string>>;
  /** Not about a field: the database refused, or the row is gone. */
  message?: string;
};

const FIELDS: ExpenseField[] = ["title", "amount", "date", "category", "orderId", "comment"];

// Where to go after saving: back to the journal's period, and nowhere else.
// Rebuilt from known keys so a crafted `back` cannot redirect off the Admin.
function backTo(form: FormData): string {
  const given = new URLSearchParams(String(form.get("back") ?? ""));
  const kept = new URLSearchParams();
  for (const key of ["period", "from", "to"]) {
    const v = given.get(key);
    if (v) kept.set(key, v);
  }
  const q = kept.toString();
  return `/expenses${q ? `?${q}` : ""}`;
}

function idOf(form: FormData): number | null {
  const id = Number(form.get("id"));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const SAVE_FAILED = "Не вдалося зберегти — база даних не відповідає. Спробуй ще раз за хвилину.";
const GONE = "Цього запису вже немає — можливо, його видалили.";

export async function saveExpense(_: ExpenseFormState, form: FormData): Promise<ExpenseFormState> {
  const session = await requireAdmin();
  const raw = Object.fromEntries(FIELDS.map((f) => [f, form.get(f)]));
  const parsed = parseExpenseInput(raw, kyivDay(new Date()));
  if (!parsed.ok) return { errors: parsed.errors };

  const id = form.has("id") ? idOf(form) : null;
  if (form.has("id") && id === null) return { message: GONE };
  try {
    if (id === null) await createExpense(parsed.value, { userId: session.userId, name: session.name });
    else if (!(await updateExpense(id, parsed.value))) return { message: GONE };
  } catch (error) {
    console.error("[expenses] save failed:", error);
    return { message: SAVE_FAILED };
  }
  // Profit on the Overview moves with every Expense.
  revalidatePath("/", "layout");
  redirect(backTo(form));
}

export async function removeExpense(_: ExpenseFormState, form: FormData): Promise<ExpenseFormState> {
  await requireAdmin();
  const id = idOf(form);
  if (id === null) return { message: GONE };
  try {
    if (!(await deleteExpense(id))) return { message: GONE };
  } catch (error) {
    console.error("[expenses] delete failed:", error);
    return { message: SAVE_FAILED };
  }
  revalidatePath("/", "layout");
  redirect(backTo(form));
}
