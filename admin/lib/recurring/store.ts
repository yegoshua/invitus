// Recurring payments in Postgres, and the generator that turns them into
// Expenses. When a payment is due is decided by lib/recurring/schedule.ts;
// what a template may say, by lib/recurring/input.ts; who may change one, by
// the Server Action. The generator is the one code path for both the daily
// cron and a template just saved, so what the page shows right after saving
// is what the cron would have written.
//
// Three rules the generator keeps:
// - an occurrence is written once, ever: `recurring_occurrences` remembers it
//   even after its Expense is deleted, so deleting a charge that never
//   happened is final, and a re-run duplicates nothing;
// - a generated Expense is never rewritten by its template — the person may
//   have corrected the real amount after the exchange rate;
// - each run starts the day after the last one (`generated_through`), so an
//   edited template changes only what is still to come, and a dollar payment
//   whose NBU rate was unavailable stays pending for the next run.
// The rules themselves are lib/recurring/generate.ts; this file is their
// database and their transaction.

import { db } from "@/lib/db";
import type { ManualCategory } from "@/lib/expenses/categories";
import type { Author, Loaded } from "@/lib/expenses/store";
import { addDays, type Day } from "@/lib/finance/period";
import type { Currency, NbuRate } from "./currency";
import { generateOccurrences, type Template } from "./generate";
import type { RecurringInput } from "./input";
import { nbuUsdRate } from "./nbu";
import type { Cadence } from "./schedule";

export interface RecurringExpense extends Template {
  id: number;
  title: string;
  category: ManualCategory;
  generatedThrough: Day | null;
  authorName: string;
  editorName: string | null;
}

interface Row {
  id: string;
  title: string;
  currency: string;
  amount_minor: string;
  category: string;
  cadence: string;
  day_of_month: number;
  month: number | null;
  starts_on: string;
  ends_on: string | null;
  paused: boolean;
  comment: string | null;
  generated_through: string | null;
  author_id: string;
  author_name: string;
  updated_by_name: string | null;
}

function toRecurring(r: Row): RecurringExpense {
  return {
    id: Number(r.id),
    title: r.title,
    currency: r.currency as Currency,
    amountMinor: Number(r.amount_minor),
    category: r.category as ManualCategory,
    cadence: r.cadence as Cadence,
    dayOfMonth: r.day_of_month,
    month: r.month,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    paused: r.paused,
    comment: r.comment,
    generatedThrough: r.generated_through,
    authorName: r.author_name,
    editorName: r.updated_by_name,
  };
}

function requireDb() {
  const sql = db();
  if (!sql) throw new Error("DATABASE_URL is not set");
  return sql;
}

// `::text` keeps every date a Kyiv day, as in lib/expenses/store.ts.
const COLUMNS = `id, title, currency, amount_minor, category, cadence, day_of_month, month, starts_on::text AS starts_on,
  ends_on::text AS ends_on, paused, comment, generated_through::text AS generated_through,
  author_id, author_name, updated_by_name`;

/** Active ones first, then by title. */
export async function listRecurring(): Promise<Loaded<RecurringExpense[]>> {
  const sql = db();
  if (!sql) return { ok: false, reason: "unconfigured" };
  try {
    const rows = await sql.unsafe<Row[]>(`SELECT ${COLUMNS} FROM recurring_expenses ORDER BY paused, lower(title), id`);
    return { ok: true, value: rows.map(toRecurring) };
  } catch (error) {
    console.error("[recurring] list failed:", error);
    return { ok: false, reason: "error" };
  }
}

export async function createRecurring(input: RecurringInput, author: Author): Promise<number> {
  const sql = requireDb();
  const [row] = await sql<Array<{ id: string }>>`
    INSERT INTO recurring_expenses (title, currency, amount_minor, category, cadence, day_of_month, month, starts_on, ends_on, comment, author_id, author_name)
    VALUES (${input.title}, ${input.currency}, ${input.amountMinor}, ${input.category}, ${input.cadence}, ${input.dayOfMonth}, ${input.month},
            ${input.startsOn}, ${input.endsOn}, ${input.comment}, ${author.userId}, ${author.name})
    RETURNING id`;
  return Number(row.id);
}

/**
 * False when there is no such template. Changes only what is still to come:
 * the run marker stays, so the next run starts where the last one stopped.
 * The exception is a template that has never produced anything — there is
 * no past to protect, and a corrected start date should take effect fully.
 */
export async function updateRecurring(id: number, input: RecurringInput, editor: Author): Promise<boolean> {
  const sql = requireDb();
  const rows = await sql`
    UPDATE recurring_expenses
    SET title = ${input.title}, currency = ${input.currency}, amount_minor = ${input.amountMinor}, category = ${input.category},
        cadence = ${input.cadence}, day_of_month = ${input.dayOfMonth}, month = ${input.month},
        starts_on = ${input.startsOn}, ends_on = ${input.endsOn}, comment = ${input.comment},
        generated_through = CASE
          WHEN EXISTS (SELECT 1 FROM recurring_occurrences o WHERE o.recurring_id = recurring_expenses.id) THEN generated_through
        END,
        updated_by_id = ${editor.userId}, updated_by_name = ${editor.name}, updated_at = now()
    WHERE id = ${id}
    RETURNING id`;
  return rows.length > 0;
}

/**
 * Pausing stops the payment; resuming starts it again from today. The days
 * in between were paused days — nothing was charged, so nothing is caught up.
 */
export async function setRecurringPaused(id: number, paused: boolean, today: Day, editor: Author): Promise<boolean> {
  const sql = requireDb();
  const rows = paused
    ? await sql`
        UPDATE recurring_expenses SET paused = true, updated_by_id = ${editor.userId}, updated_by_name = ${editor.name}, updated_at = now()
        WHERE id = ${id} RETURNING id`
    : await sql`
        UPDATE recurring_expenses
        SET paused = false, generated_through = ${addDays(today, -1)},
            updated_by_id = ${editor.userId}, updated_by_name = ${editor.name}, updated_at = now()
        WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** The Expenses it already produced stay (ON DELETE SET NULL): that money left. */
export async function deleteRecurring(id: number): Promise<boolean> {
  const sql = requireDb();
  const rows = await sql`DELETE FROM recurring_expenses WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** Some templates failed or left a day pending; the rest was written and is counted. */
export class GenerationError extends Error {
  readonly created: number;
  constructor(created: number, failures: string[]) {
    super(failures.join("; ").slice(0, 500));
    this.created = created;
  }
}

/**
 * Writes every due, never-written occurrence up to today as an Expense, for
 * every template or just one, and returns how many it wrote. Each template is
 * its own transaction with its row locked, so the cron and a save landing at
 * the same moment cannot both claim a day, and one failing template does not
 * stop the others. Throws GenerationError after the run when any failed.
 */
export async function generateRecurring(today: Day, onlyId?: number): Promise<number> {
  const sql = requireDb();
  const ids = onlyId
    ? [onlyId]
    : (await sql<Array<{ id: string }>>`SELECT id FROM recurring_expenses WHERE NOT paused ORDER BY id`).map((r) => Number(r.id));

  // One NBU request per day per run, however many dollar templates share it —
  // a failure included, so a down NBU costs one timeout, not one per template.
  const rates = new Map<Day, Promise<NbuRate>>();
  const usdRate = (day: Day) => {
    if (!rates.has(day)) rates.set(day, nbuUsdRate(day));
    return rates.get(day)!;
  };

  let created = 0;
  const failures: string[] = [];
  for (const id of ids) {
    try {
      const result = await sql.begin(async (tx) => {
        const [row] = await tx.unsafe<Row[]>(`SELECT ${COLUMNS} FROM recurring_expenses WHERE id = $1 FOR UPDATE`, [id]);
        if (!row) return null;
        const t = toRecurring(row);
        const r = await generateOccurrences(t, t.generatedThrough, today, {
          written: async (day) =>
            (await tx`SELECT 1 FROM recurring_occurrences WHERE recurring_id = ${id} AND due_on = ${day}`).length > 0,
          usdRate,
          write: async (o) => {
            await tx`INSERT INTO recurring_occurrences (recurring_id, due_on) VALUES (${id}, ${o.day})`;
            await tx`
              INSERT INTO expenses (title, amount_kop, spent_on, category, comment, source, author_id, author_name, recurring_id)
              VALUES (${t.title}, ${o.amountKop}, ${o.day}, ${t.category}, ${o.comment}, 'manual', ${row.author_id}, ${t.authorName}, ${id})`;
          },
        });
        if (r.generatedThrough !== t.generatedThrough) {
          await tx`UPDATE recurring_expenses SET generated_through = ${r.generatedThrough} WHERE id = ${id}`;
        }
        return r;
      });
      if (!result) continue;
      created += result.written;
      if (result.error) failures.push(`#${id} ${result.error}`);
    } catch (error) {
      console.error(`[recurring] template ${id} failed:`, error);
      failures.push(`#${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length) throw new GenerationError(created, failures);
  return created;
}

/** The cron's run, in the journal the ingest writes to (lib/fees/store.ts), under its own source. */
export async function recordRecurringRun(run: { startedAt: Date; finishedAt: Date; ok: boolean; rows: number | null; error: string | null }) {
  const sql = requireDb();
  await sql`
    INSERT INTO ingest_runs (source, started_at, finished_at, ok, row_count, error)
    VALUES ('recurring', ${run.startedAt}, ${run.finishedAt}, ${run.ok}, ${run.rows}, ${run.error})`;
}
