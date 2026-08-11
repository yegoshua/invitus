// Compress every 3D model in Strapi and repoint the products at the result.
//
//   node --env-file=.env.local scripts/compress-models.mts
//   node --env-file=.env.local scripts/compress-models.mts --apply
//
// Dry-run by default — it writes to the production CMS. Idempotent: a model
// that already carries the compressed-texture extension is skipped, so this can
// be re-run after adding a belt in Strapi and it will only touch the new one.
//
// Why this exists, and why it is shaped this way:
//
//   1. **The weight is textures, not geometry.** Measured across the catalogue,
//      97% of a belt's bytes are PNG textures — several 4096² — against roughly
//      1 MB of geometry. Reaching for Draco first, the obvious instinct, would
//      have compressed the 3% and left the file at 39 MB.
//   2. **The recipe is resize → WebP → meshopt, in that order.** Resizing first
//      means WebP encodes a quarter of the pixels; meshopt runs last because it
//      rewrites buffer views the texture steps would otherwise have to redo.
//      Verified on the heaviest belt: 40.6 MB → 2.23 MB, download 6.5s → 1.5s,
//      PSNR 38.6 dB on base colour and 38.7 dB on the normal map at the scale
//      the texture is actually sampled at on screen.
//   3. **Geometry is re-packed, never simplified.** `gltf-transform optimize`
//      would be one command instead of three, but it runs `weld` and `simplify`,
//      which decimate the mesh. On the hero image of a product that is a
//      silhouette change to save ~1 MB of the 40, so the steps are spelled out
//      here rather than delegated to a convenient default.
//   4. **Nothing is added to the app.** three reads `EXT_texture_webp` natively
//      and the meshopt decoder is already attached in
//      `components/models/dynamic-model.tsx`. KTX2/Basis would need a loader
//      wired up plus a `toktx` binary here; its win is GPU memory rather than
//      transfer, which only matters if a page ever shows several models at once.
//
// The old media entry is left in Strapi on purpose: repointing `model3d` back to
// it is the whole rollback. Nothing here deletes anything.
//
// glTF-Transform is invoked through `pnpm dlx` at a pinned version rather than
// added to devDependencies — it pulls ~190 packages (sharp included) for a
// script that runs when a model is added, not on every install or build.

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GLTF_TRANSFORM = "@gltf-transform/cli@4.4.2";

/** Textures above this are resized down to it before encoding. */
const TEXTURE_SIZE = 2048;
/** WebP quality. 80 measured indistinguishable from the 4K PNG on screen. */
const TEXTURE_QUALITY = 80;

const APPLY = process.argv.includes("--apply");

const STRAPI_URL = env("NEXT_PUBLIC_STRAPI_URL");
const STRAPI_TOKEN = env("STRAPI_API_TOKEN");

interface StrapiMedia {
  id: number;
  name: string;
  url: string;
  size: number; // KB, as Strapi reports it
}

interface StrapiProduct {
  documentId: string;
  name: string;
  model3d: StrapiMedia | null;
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — run with --env-file=.env.local`);
  return value;
}

function mb(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

// ── Strapi ────────────────────────────────────────────────────────────────

async function fetchProducts(): Promise<StrapiProduct[]> {
  const all: StrapiProduct[] = [];
  for (let page = 1; ; page++) {
    const url =
      `${STRAPI_URL}/api/products?populate[model3d]=true` +
      `&pagination[page]=${page}&pagination[pageSize]=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Strapi products ${res.status}: ${await res.text()}`);
    const body = await res.json();
    all.push(...body.data);
    if (page >= (body.meta?.pagination?.pageCount ?? 1)) break;
  }
  return all;
}

async function uploadModel(path: string, filename: string): Promise<StrapiMedia> {
  const form = new FormData();
  const bytes = await readFile(path);
  form.append("files", new Blob([bytes], { type: "model/gltf-binary" }), filename);

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Strapi upload ${res.status}: ${await res.text()}`);
  const [file] = await res.json();
  return file;
}

async function repointProduct(documentId: string, mediaId: number): Promise<void> {
  const res = await fetch(`${STRAPI_URL}/api/products/${documentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { model3d: mediaId } }),
  });
  if (!res.ok) throw new Error(`Strapi update ${res.status}: ${await res.text()}`);
}

// ── glTF ──────────────────────────────────────────────────────────────────

/**
 * The extensions a .glb declares, read from its JSON chunk.
 *
 * Only the head of the file is fetched: the JSON chunk sits at the front, so a
 * megabyte answers "is this already compressed?" without pulling 40 MB to find
 * out. Anything unparseable is reported as "no extensions", which routes the
 * file into compression rather than silently skipping it.
 */
async function declaredExtensions(url: string): Promise<string[]> {
  const res = await fetch(url, { headers: { Range: "bytes=0-1048575" } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const head = Buffer.from(await res.arrayBuffer());
  try {
    const jsonLength = head.readUInt32LE(12);
    const json = JSON.parse(head.subarray(20, 20 + jsonLength).toString("utf8"));
    return json.extensionsUsed ?? [];
  } catch {
    return [];
  }
}

async function download(url: string, to: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  await writeFile(to, Buffer.from(await res.arrayBuffer()));
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["dlx", GLTF_TRANSFORM, ...args], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`gltf-transform ${args[0]} failed (${code}): ${stderr}`))
    );
  });
}

async function compress(input: string, output: string, dir: string): Promise<void> {
  const resized = join(dir, "resized.glb");
  const webp = join(dir, "webp.glb");
  await run(["resize", input, resized, "--width", `${TEXTURE_SIZE}`, "--height", `${TEXTURE_SIZE}`]);
  await run(["webp", resized, webp, "--quality", `${TEXTURE_QUALITY}`]);
  await run(["meshopt", webp, output]);
}

// ── main ──────────────────────────────────────────────────────────────────

const products = (await fetchProducts()).filter((p) => p.model3d);
console.log(
  `${products.length} product(s) with a 3D model. ` +
    (APPLY ? "Applying." : "Dry run — pass --apply to write.")
);

let before = 0;
let after = 0;
const skipped: string[] = [];
const failed: string[] = [];

for (const product of products) {
  const media = product.model3d!;
  const label = `${product.name} (${media.name})`;

  let dir: string | undefined;
  try {
    const extensions = await declaredExtensions(media.url);
    if (extensions.includes("EXT_texture_webp")) {
      skipped.push(label);
      console.log(`· ${label} — already compressed, skipping`);
      continue;
    }

    dir = await mkdtemp(join(tmpdir(), "invitus-glb-"));
    const source = join(dir, "source.glb");
    const output = join(dir, "compressed.glb");
    await download(media.url, source);
    await compress(source, output, dir);

    const sourceSize = (await stat(source)).size;
    const outputSize = (await stat(output)).size;
    before += sourceSize;
    after += outputSize;

    const ratio = (sourceSize / outputSize).toFixed(1);
    console.log(`✓ ${label} — ${mb(sourceSize)} → ${mb(outputSize)} (${ratio}×)`);

    if (APPLY) {
      const filename = `${media.name.replace(/\.glb$/i, "")}-compressed.glb`;
      const uploaded = await uploadModel(output, filename);
      await repointProduct(product.documentId, uploaded.id);
      console.log(`  ↳ uploaded #${uploaded.id}, product repointed`);
    }
  } catch (error) {
    failed.push(label);
    console.error(`✗ ${label} — ${(error as Error).message}`);
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true });
  }
}

console.log(
  `\n${mb(before)} → ${mb(after)}` +
    (before > 0 ? ` (${(before / after).toFixed(1)}× smaller)` : "")
);
if (skipped.length) console.log(`${skipped.length} already compressed.`);
if (failed.length) {
  console.error(`${failed.length} failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}
