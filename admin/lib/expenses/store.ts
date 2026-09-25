// Expenses in Postgres. No rules of its own: what may be written is decided
// by lib/expenses/input.ts, who may write it by the Server Action. The one
// thing enforced here is that a person only ever changes `manual` rows — the
// ingest's Ad spend rows are shown, never edited (PRD #103, story 32), and
// are written only by replaceAdSpend below.

import { db } from "@/lib/db";
import type { Day, Period } from "@/lib/finance/period";
import { staleAdSpend, type AdSpendRow } from "@/lib/ingest/ad-spend";
import type { ExpenseCategory, ExpenseSource } from "./categories";
import type { ExpenseInput } from "./input";

export interface Expense {
  id: number;
  title: string;
  amountKop: number;
  date: Day;
  category: ExpenseCategory;
  source: ExpenseSource;
  orderId: number | null;
  comment: string | null;
  authorName: string | null;
  /** Set once someone has edited it. */
  editorName: string | null;
  /** The Recurring payment it was generated from (lib/recurring/store.ts), if any. */
  recurringId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type Loaded<T> = { ok: true; value: T } | { ok: false; reason: "unconfigured" | "error" };

export interface Author {
  userId: number;
  name: string;
}

interface Row {
  id: string;
  title: string;
  amount_kop: string;
  date: string;
  category: string;
  source: string;
  order_id: number | null;
  comment: string | null;
  author_name: string | null;
  updated_by_name: string | null;
  recurring_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function toExpense(r: Row): Expense {
  return {
    id: Number(r.id),
    title: r.title,
    amountKop: Number(r.amount_kop),
    date: r.date,
    category: r.category as ExpenseCategory,
    source: r.source as ExpenseSource,
    orderId: r.order_id,
    comment: r.comment,
    authorName: r.author_name,
    editorName: r.updated_by_name,
    recurringId: r.recurring_id == null ? null : Number(r.recurring_id),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Expenses dated from..to inclusive, newest day first. */
export async function listExpenses(from: Day, to: Day): Promise<Loaded<Expense[]>> {
  const sql = db();
  if (!sql) return { ok: false, reason: "unconfigured" };
  try {
    // `::text` keeps the date a Kyiv day; as a JS Date it would be midnight
    // somewhere, and the server's somewhere is UTC.
    const rows = await sql<Row[]>`
      SELECT id, title, amount_kop, spent_on::text AS date, category, source, order_id,
             comment, author_name, updated_by_name, recurring_id, created_at, updated_at
      FROM expenses
      WHERE spent_on BETWEEN ${from} AND ${to}
      ORDER BY spent_on DESC, created_at DESC`;
    return { ok: true, value: rows.map(toExpense) };
  } catch (error) {
    console.error("[expenses] list failed:", error);
    return { ok: false, reason: "error" };
  }
}

function requireDb() {
  const sql = db();
  if (!sql) throw new Error("DATABASE_URL is not set");
  return sql;
}

export async function createExpense(input: ExpenseInput, author: Author): Promise<void> {
  const sql = requireDb();
  await sql`
    INSERT INTO expenses (title, amount_kop, spent_on, category, order_id, comment, source, author_id, author_name)
    VALUES (${input.title}, ${input.amountKop}, ${input.date}, ${input.category}, ${input.orderId},
            ${input.comment}, 'manual', ${author.userId}, ${author.name})`;
}

/** False when there is no such manual Expense — deleted meanwhile, or an Ad spend row. */
export async function updateExpense(id: number, input: ExpenseInput, editor: Author): Promise<boolean> {
  const sql = requireDb();
  const rows = await sql`
    UPDATE expenses
    SET title = ${input.title}, amount_kop = ${input.amountKop}, spent_on = ${input.date},
        category = ${input.category}, order_id = ${input.orderId}, comment = ${input.comment},
        updated_by_id = ${editor.userId}, updated_by_name = ${editor.name}, updated_at = now()
    WHERE id = ${id} AND source = 'manual'
    RETURNING id`;
  return rows.length > 0;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const sql = requireDb();
  const rows = await sql`DELETE FROM expenses WHERE id = ${id} AND source = 'manual' RETURNING id`;
  return rows.length > 0;
}

/**
 * The ingest's writer for one platform's Ad spend over the window it just
 * re-read in full. In one transaction: every campaign-day Meta reported is
 * upserted on (spent_on, source, campaign) — a re-run changes nothing, a
 * renamed campaign gets its new title, a revised amount its new amount — and
 * every stored campaign-day in the window that the platform no longer reports
 * is deleted (staleAdSpend: a day revised to nothing). A zero amount cannot
 * be stored anyway (amount_kop > 0), so deleting is the only honest way to
 * say "this cost nothing after all".
 */
export async function replaceAdSpend(
  source: Exclude<ExpenseSource, "manual">,
  window: Period,
  rows: AdSpendRow[]
): Promise<{ upserted: number; removed: number }> {
  const sql = requireDb();
  return sql.begin(async (tx) => {
    const stored = await tx<Array<{ id: string; day: string; campaign: string }>>`
      SELECT id, spent_on::text AS day, campaign FROM expenses
      WHERE source = ${source} AND spent_on BETWEEN ${window.from} AND ${window.to}`;
    const stale = staleAdSpend(stored, rows, window).map((r) => r.id);
    if (stale.length) await tx`DELETE FROM expenses WHERE id IN ${tx(stale)} AND source = ${source}`;
    if (rows.length) {
      const values = rows.map((r) => ({
        title: r.title,
        amount_kop: r.amountKop,
        spent_on: r.day,
        category: "ads",
        source,
        campaign: r.campaign,
      }));
      // updated_at moves only when something did, so it says when Meta last revised the row.
      await tx`
        INSERT INTO expenses ${tx(values, "title", "amount_kop", "spent_on", "category", "source", "campaign")}
        ON CONFLICT (spent_on, source, campaign) WHERE source <> 'manual' DO UPDATE
        SET title = EXCLUDED.title, amount_kop = EXCLUDED.amount_kop, updated_at = now()
        WHERE expenses.title IS DISTINCT FROM EXCLUDED.title OR expenses.amount_kop <> EXCLUDED.amount_kop`;
    }
    return { upserted: rows.length, removed: stale.length };
  });
}
