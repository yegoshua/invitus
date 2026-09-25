// Applies db/migrations/*.sql in name order, each once, each in a transaction.
// Dry-run by default, like the site's scripts: `pnpm db:migrate --apply`.
//
// Run it against the database the deploy will use *before* that deploy —
// Vercel does not run migrations, and a page that selects a missing column
// shows the "database unavailable" banner rather than the journal.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const apply = process.argv.includes("--apply");
// The direct URL where there is one: DDL through PgBouncer's transaction mode
// works, but a migration is the one place a direct connection costs nothing.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (vercel env pull, or .env.local).");
  process.exit(1);
}

const dir = path.join(import.meta.dirname, "..", "db", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
  const pending = files.filter((f) => !done.has(f));

  if (pending.length === 0) console.log("Up to date.");
  for (const file of pending) {
    if (!apply) {
      console.log(`would apply ${file}`);
      continue;
    }
    const body = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    console.log(`applied ${file}`);
  }
  if (!apply && pending.length > 0) console.log("\nDry run. Re-run with --apply to write.");
} finally {
  await sql.end();
}
