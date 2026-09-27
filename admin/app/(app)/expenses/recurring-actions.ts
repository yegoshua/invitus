"use server";

// Recurring payment writes (#121). The same contract as ./actions.ts: every
// action checks the session itself (ADR 0002) and validates on the server.
//
// Saving or resuming a template runs the generator for it straight away — the
// same code path as the daily cron — so a subscription that was due earlier
// this month shows in the journal now, not tomorrow morning.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { kyivDay } from "@/lib/finance/period";
import { parseRecurringInput, RECURRING_FIELDS, type RecurringField } from "@/lib/recurring/input";
import { createRecurring, deleteRecurring, generateRecurring, setRecurringPaused, updateRecurring } from "@/lib/recurring/store";

export type RecurringFormState = {
  errors?: Partial<Record<RecurringField, string>>;
  message?: string;
};

const SAVE_FAILED = "Не вдалося зберегти — база даних не відповідає. Спробуй ще раз за хвилину.";
const GONE = "Цього платежу вже немає — можливо, його видалили.";

// Back to the journal's period and nowhere else, as in ./actions.ts.
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

// The template is saved either way; a failed generation is the cron's to
// retry tomorrow, not a reason to tell the person their save failed.
async function generateNow(today: string, id: number) {
  try {
    await generateRecurring(today, id);
  } catch (error) {
    console.error("[recurring] generation after save failed:", error);
  }
}

function done(form: FormData): never {
  // Profit on the Overview moves with every generated Expense.
  revalidatePath("/", "layout");
  redirect(backTo(form));
}

export async function saveRecurring(_: RecurringFormState, form: FormData): Promise<RecurringFormState> {
  const session = await requireAdmin();
  const parsed = parseRecurringInput(Object.fromEntries(RECURRING_FIELDS.map((f) => [f, form.get(f)])));
  if (!parsed.ok) return { errors: parsed.errors };

  let id = form.has("id") ? idOf(form) : null;
  if (form.has("id") && id === null) return { message: GONE };
  const who = { userId: session.userId, name: session.name };
  try {
    if (id === null) id = await createRecurring(parsed.value, who);
    else if (!(await updateRecurring(id, parsed.value, who))) return { message: GONE };
  } catch (error) {
    console.error("[recurring] save failed:", error);
    return { message: SAVE_FAILED };
  }
  await generateNow(kyivDay(new Date()), id);
  done(form);
}

export async function pauseRecurring(_: RecurringFormState, form: FormData): Promise<RecurringFormState> {
  const session = await requireAdmin();
  const id = idOf(form);
  if (id === null) return { message: GONE };
  const paused = form.get("paused") === "1";
  const today = kyivDay(new Date());
  try {
    if (!(await setRecurringPaused(id, paused, today, { userId: session.userId, name: session.name }))) return { message: GONE };
  } catch (error) {
    console.error("[recurring] pause failed:", error);
    return { message: SAVE_FAILED };
  }
  if (!paused) await generateNow(today, id);
  done(form);
}

export async function removeRecurring(_: RecurringFormState, form: FormData): Promise<RecurringFormState> {
  await requireAdmin();
  const id = idOf(form);
  if (id === null) return { message: GONE };
  try {
    if (!(await deleteRecurring(id))) return { message: GONE };
  } catch (error) {
    console.error("[recurring] delete failed:", error);
    return { message: SAVE_FAILED };
  }
  done(form);
}
