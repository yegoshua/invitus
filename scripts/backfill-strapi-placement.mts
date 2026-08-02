// One-off: give every Strapi product a `keycrmId` and a clean per-category
// `order`. See https://github.com/yegoshua/invitus/issues/27.
//
//   node --env-file=.env.local scripts/backfill-strapi-placement.mts
//   node --env-file=.env.local scripts/backfill-strapi-placement.mts --apply
//
// Dry-run by default — it writes to the production CMS. Idempotent: re-running
// after fixing an unmatched entry by hand only touches what still differs.
//
// Two things worth knowing before reading the matching code:
//
//   1. The join is `slugify(keycrm.name) === slugify(strapi.name)`, NOT
//      `strapi.slug`. Strapi's own slug field uses a different convention
//      ("belt-poseidon" vs "poseidon-lifting-belt"), so matching on it would
//      pair nothing at all. This mirrors lib/product-extras.ts exactly, which
//      is the point: the backfill has to reproduce today's pairing, not invent
//      a better one. Writing `keycrmId` is what finally makes the link survive
//      a rename in KeyCRM.
//   2. A plain `PUT /api/products/:documentId` on Strapi 5.34 writes through to
//      the *published* version, not just the draft — verified against
//      production before this script was trusted with `--apply`. No separate
//      publish step is needed, and the site sees the values immediately after
//      the revalidate webhook fires.

import { slugify } from "../lib/slugify.ts";
import { HIDDEN_CATEGORY_IDS } from "../lib/hidden-categories.ts";

/** Gap between neighbours, so a product can be slotted in without renumbering. */
const ORDER_STEP = 10;

const APPLY = process.argv.includes("--apply");

interface KeyCrmProduct {
  id: number;
  name: string;
  category_id: number | null;
  is_archived: boolean;
}

interface StrapiProduct {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  keycrmId: number | null;
  order: number | null;
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — run with --env-file=.env.local`);
  return value;
}

// ── fetching ──────────────────────────────────────────────────────────────

async function fetchKeyCrmProducts(): Promise<KeyCrmProduct[]> {
  const token = env("KEYCRM_API_TOKEN");
  const all: KeyCrmProduct[] = [];

  for (let page = 1; ; page++) {
    const response = await fetch(
      `https://openapi.keycrm.app/v1/products?limit=50&page=${page}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
    );
    if (!response.ok) {
      throw new Error(`KeyCRM /products failed: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as {
      data: KeyCrmProduct[];
      last_page: number;
      next_page_url: string | null;
    };
    all.push(...json.data);
    if (page >= json.last_page || !json.next_page_url) break;
  }

  // Same visibility rules as lib/api.ts — an archived or hidden-category
  // product is not on the site, so it must not claim a place in the ordering.
  return all
    .filter((p) => !p.is_archived)
    .filter((p) => p.category_id == null || !HIDDEN_CATEGORY_IDS.has(p.category_id))
    .sort((a, b) => a.id - b.id);
}

async function fetchStrapiProducts(): Promise<StrapiProduct[]> {
  const response = await fetch(
    `${env("NEXT_PUBLIC_STRAPI_URL")}/api/products` +
      "?fields[0]=name&fields[1]=slug&fields[2]=keycrmId&fields[3]=order" +
      "&pagination[limit]=100&sort=id:asc",
    { headers: { Authorization: `Bearer ${env("STRAPI_API_TOKEN")}` } }
  );
  if (!response.ok) {
    throw new Error(`Strapi /products failed: ${response.status} ${response.statusText}`);
  }
  const json = (await response.json()) as { data: StrapiProduct[] };
  return json.data;
}

async function updateStrapiProduct(
  documentId: string,
  data: { keycrmId: number; order: number }
): Promise<void> {
  const response = await fetch(
    `${env("NEXT_PUBLIC_STRAPI_URL")}/api/products/${documentId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${env("STRAPI_API_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    }
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Strapi PUT ${documentId} failed: ${response.status} ${response.statusText} ${body.slice(0, 300)}`
    );
  }
}

// ── main ──────────────────────────────────────────────────────────────────

async function main() {
  const [keycrmProducts, strapiProducts] = await Promise.all([
    fetchKeyCrmProducts(),
    fetchStrapiProducts(),
  ]);

  console.log(
    `KeyCRM: ${keycrmProducts.length} live products · Strapi: ${strapiProducts.length} entries\n`
  );

  const strapiByNameSlug = new Map<string, StrapiProduct>();
  for (const p of strapiProducts) strapiByNameSlug.set(slugify(p.name), p);

  // Order is numbered per KeyCRM category, ascending KeyCRM id — the sequence
  // the catalog renders today, so switching on the new sort changes nothing.
  const nextOrderByCategory = new Map<number, number>();

  const planned: {
    strapi: StrapiProduct;
    keycrmId: number;
    order: number;
    changed: boolean;
  }[] = [];
  const missingInStrapi: KeyCrmProduct[] = [];
  const matchedStrapiIds = new Set<number>();

  for (const kc of keycrmProducts) {
    const strapi = strapiByNameSlug.get(slugify(kc.name));
    if (!strapi) {
      missingInStrapi.push(kc);
      continue;
    }
    matchedStrapiIds.add(strapi.id);

    const categoryKey = kc.category_id ?? -1;
    const order = (nextOrderByCategory.get(categoryKey) ?? 0) + ORDER_STEP;
    nextOrderByCategory.set(categoryKey, order);

    planned.push({
      strapi,
      keycrmId: kc.id,
      order,
      changed: strapi.keycrmId !== kc.id || strapi.order !== order,
    });
  }

  const orphanedInStrapi = strapiProducts.filter((p) => !matchedStrapiIds.has(p.id));

  for (const p of planned) {
    const mark = p.changed ? "→" : "=";
    const was = `keycrmId ${p.strapi.keycrmId ?? "—"}, order ${p.strapi.order ?? "—"}`;
    console.log(
      `${mark} ${p.strapi.name.padEnd(32)} ${was.padEnd(28)} ${
        p.changed ? `keycrmId ${p.keycrmId}, order ${p.order}` : "(already correct)"
      }`
    );
  }

  // Both lists below are the ones that will fall back to defaults on the site,
  // so they are printed separately and loudly rather than folded into a count.
  if (missingInStrapi.length) {
    console.log(
      `\n⚠  ${missingInStrapi.length} KeyCRM product(s) have no Strapi entry — ` +
        `no 3D model, hero image or placement, and they sort to the end:`
    );
    for (const p of missingInStrapi) console.log(`   · ${p.name} (KeyCRM id ${p.id})`);
  }

  if (orphanedInStrapi.length) {
    console.log(
      `\n⚠  ${orphanedInStrapi.length} Strapi entr(ies) match no live KeyCRM product ` +
        `(archived, hidden category, or renamed on one side only) — their content is unused:`
    );
    for (const p of orphanedInStrapi) console.log(`   · ${p.name} (Strapi id ${p.id})`);
  }

  const toWrite = planned.filter((p) => p.changed);
  console.log(
    `\n${planned.length} matched · ${toWrite.length} need writing · ` +
      `${planned.length - toWrite.length} already correct`
  );

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write.");
    return;
  }

  for (const p of toWrite) {
    await updateStrapiProduct(p.strapi.documentId, {
      keycrmId: p.keycrmId,
      order: p.order,
    });
    console.log(`✓ ${p.strapi.name} → keycrmId ${p.keycrmId}, order ${p.order}`);
  }
  console.log(`\nWrote ${toWrite.length} product(s).`);
  console.log(
    "Now fire the revalidate webhook (POST /api/revalidate) so the site picks them up."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
