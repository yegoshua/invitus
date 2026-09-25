// The Admin's Postgres (Neon, through the Vercel Marketplace). Only the
// Admin's own records live here — Expenses, and from #110 fees and ingest
// runs. Orders stay in KeyCRM.

import postgres from "postgres";

let client: postgres.Sql | null = null;

/** Null when DATABASE_URL is unset: the pages say so instead of failing. */
export function db(): postgres.Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  client ??= postgres(url, {
    // Neon's pooled URL is PgBouncer in transaction mode, which has no
    // prepared statements to reuse.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return client;
}
