// Expenses in Postgres. No rules of its own: what may be written is decided
// by lib/expenses/input.ts, who may write it by the Server Action. The one
// thing enforced here is that only `manual` rows are ever changed — the
// ingest's Ad spend rows are shown, never edited (PRD #103, story 32).

import { db } from "@/lib/db";
import type { Day } from "@/lib/finance/period";
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
             comment, author_name, updated_by_name, created_at, updated_at
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
