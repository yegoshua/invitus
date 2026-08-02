#!/usr/bin/env node
/**
 * Builds the site for production, serves it, measures the homepage with
 * Lighthouse in a mobile profile, and reports against `perf/budget.json`.
 *
 *   pnpm perf:lighthouse              build, serve, measure
 *   pnpm perf:lighthouse --skip-build measure the existing .next build
 *   pnpm perf:lighthouse --runs 1     one run instead of the median of three
 *   pnpm perf:lighthouse --label baseline-main  name the saved report
 *
 * Chrome is launched by chrome-launcher into a throwaway user-data-dir with
 * extensions disabled, so the numbers describe the site and nothing else.
 * Reports land in perf/reports/ (git-ignored).
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

import { evaluateBudget } from "./evaluate-budget.mjs";
import { pickMedianRun } from "./median-run.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BUDGET_PATH = resolve(ROOT, "perf/budget.json");
const REPORTS_DIR = resolve(ROOT, "perf/reports");

/** A fresh profile with nothing installed in it is the whole point (#35). */
const CHROME_FLAGS = [
  "--headless=new",
  "--disable-extensions",
  "--disable-component-extensions-with-background-pages",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-sync",
];

let args, budget;
try {
  args = parseArgs(process.argv.slice(2));
  budget = JSON.parse(readFileSync(BUDGET_PATH, "utf8"));
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exit(1);
}

const port = args.port ?? 4318;
const url = `http://localhost:${port}${args.url ?? budget.url ?? "/"}`;

let server;
let chrome;

try {
  if (!args.skipBuild) {
    console.log("→ building for production");
    const build = spawnSync("pnpm", ["build"], { cwd: ROOT, stdio: "inherit" });
    if (build.status !== 0) throw new Error("production build failed");
  }

  console.log(`→ serving on port ${port}`);
  server = await startServer(port);

  chrome = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS });

  const runs = [];
  for (let i = 1; i <= args.runs; i++) {
    console.log(`→ measuring ${url} (mobile, clean Chrome profile) — run ${i}/${args.runs}`);
    const run = await lighthouse(
      url,
      { port: chrome.port, output: ["json", "html"], logLevel: "error" },
      // Lighthouse's default config is the mobile profile: Moto G Power at DPR
      // 2.625, simulated 4G, 4x CPU slowdown.
      undefined,
    );
    runs.push({ metrics: readMetrics(run.lhr), run });
  }

  const median = pickMedianRun(runs.map((r) => r.metrics));
  const { run } = runs.find((r) => r.metrics === median);
  const { pass, results } = evaluateBudget(budget, median);

  report(run.lhr, results, pass, args.runs);
  saveReports(run, args.label);

  process.exitCode = pass ? 0 : 1;
} catch (error) {
  console.error(`\n✖ ${error.message}`);
  process.exitCode = 1;
} finally {
  await chrome?.kill();
  server?.kill();
}

/** Pulls the budgeted metrics out of a Lighthouse result. */
function readMetrics(lhr) {
  const numeric = (id) => lhr.audits[id]?.numericValue;

  return {
    "largest-contentful-paint": numeric("largest-contentful-paint"),
    "speed-index": numeric("speed-index"),
    "cumulative-layout-shift": numeric("cumulative-layout-shift"),
    "total-blocking-time": numeric("total-blocking-time"),
    "transfer-before-load": transferBeforeLoad(lhr),
  };
}

/**
 * Bytes actually pulled down before the load event — the figure #34 is about.
 * Requests that only *start* after load (lazy media, prefetches) are the point
 * of the work, so they must not count against, or for, the number.
 */
function transferBeforeLoad(lhr) {
  const requests = lhr.audits["network-requests"]?.details?.items;
  if (!requests) return undefined;

  const load = lhr.audits.metrics?.details?.items?.[0]?.observedLoad;
  const beforeLoad =
    typeof load === "number"
      ? requests.filter((r) => (r.networkRequestTime ?? 0) <= load)
      : requests;

  return beforeLoad.reduce((total, r) => total + (r.transferSize ?? 0), 0);
}

function report(lhr, results, pass, runs) {
  const score = Math.round((lhr.categories.performance?.score ?? 0) * 100);

  console.log(
    `\nLighthouse ${lhr.lighthouseVersion} · mobile · ${lhr.finalDisplayedUrl}` +
      (runs > 1 ? ` · median of ${runs} runs` : ""),
  );
  console.log(`Performance score: ${score}\n`);

  const icon = { pass: "✔", fail: "✖", warn: "!", missing: "?" };
  for (const r of results) {
    const value = r.value === null ? "—" : format(r);
    const limit = format({ ...r, value: r.budget });
    const note =
      r.status === "warn"
        ? "  (soft target — does not fail the run)"
        : r.status === "missing"
          ? "  (metric missing from the run)"
          : "";
    console.log(
      `${icon[r.status]} ${r.metric.padEnd(26)} ${value.padStart(10)}  budget ${limit}${note}`,
    );
  }

  console.log(`\n${pass ? "✔ within budget" : "✖ over budget"}`);
}

function format({ value, unit }) {
  if (unit === "ms") return `${(value / 1000).toFixed(2)} s`;
  if (unit === "KiB") return `${(value / 1024).toFixed(2)} MiB`;
  return String(value);
}

function saveReports(run, label) {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const name = label ?? "latest";
  const [json, html] = run.report;
  writeFileSync(resolve(REPORTS_DIR, `${name}.json`), json);
  writeFileSync(resolve(REPORTS_DIR, `${name}.html`), html);
  console.log(`\nReport: perf/reports/${name}.html`);
}

async function startServer(port) {
  const server = spawn("pnpm", ["start", "--port", String(port)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "inherit"],
  });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("server exited before it was ready");
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok) return server;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  server.kill();
  throw new Error(`server did not become ready on port ${port}`);
}

function parseArgs(argv) {
  const args = { skipBuild: false, runs: 3 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--skip-build") args.skipBuild = true;
    else if (argv[i] === "--port") args.port = Number(argv[++i]);
    else if (argv[i] === "--url") args.url = argv[++i];
    else if (argv[i] === "--label") args.label = argv[++i];
    else if (argv[i] === "--runs") args.runs = Number(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}
