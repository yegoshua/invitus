// The Admin's Postgres (Neon, through the Vercel Marketplace). Only the
// Admin's own records live here — Expenses, and from #110 fees and ingest
// runs. Orders stay in KeyCRM.

import postgres from "postgres";

let client: postgres.Sql | null = null;

// The Vercel Neon integration was connected with the prefix ADMIN_DB_, so on
// Vercel the pooled URL is ADMIN_DB_DATABASE_URL; a plain DATABASE_URL (local
// .env.local) wins when both are set.
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.ADMIN_DB_DATABASE_URL;
}

/** Null when there is no database URL: the pages say so instead of failing. */
export function db(): postgres.Sql | null {
  const url = databaseUrl();
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
