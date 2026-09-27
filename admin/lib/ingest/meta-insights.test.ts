import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeAdSpend } from "./ad-spend.ts";
import { mapInsights } from "./meta-insights.ts";

// One row of GET /{act_id}/insights?level=campaign&time_increment=1
// &fields=campaign_id,campaign_name,spend,account_currency, as the Marketing
// API returns it: every metric a string, the day as date_start = date_stop.
function row(over: Record<string, unknown> = {}) {
  return {
    campaign_id: "120212345678900001",
    campaign_name: "Пояси — ретаргет",
    spend: "412.37",
    account_currency: "UAH",
    date_start: "2026-09-20",
    date_stop: "2026-09-20",
    ...over,
  };
}

const page = (data: unknown[], next?: string) => ({
  data,
  paging: { cursors: { before: "MAZDZD", after: "MQZDZD" }, ...(next ? { next } : {}) },
});

test("an empty page is no rows, not an error", () => {
  assert.deepEqual(mapInsights({ data: [], paging: { cursors: {} } }), { rows: [], skipped: [] });
  assert.deepEqual(mapInsights({ data: [] }), { rows: [], skipped: [] });
});

test("a body that is not an insights page fails the stage", () => {
  assert.throws(() => mapInsights({ error: { message: "Invalid OAuth access token" } }), /no data/);
  assert.throws(() => mapInsights(null), /no data/);
});

test("a campaign-day becomes an Ad spend row: the day, the campaign id as the key, kopecks from the decimal string", () => {
  assert.deepEqual(mapInsights(page([row()])), {
    rows: [{ day: "2026-09-20", campaign: "120212345678900001", title: "Meta · Пояси — ретаргет", amountKop: 41_237 }],
    skipped: [],
  });
});

test("a day with no spend is dropped quietly — it is not an Expense, and not an error", () => {
  assert.deepEqual(mapInsights(page([row({ spend: "0" }), row({ spend: "0.00", campaign_id: "2" })])), { rows: [], skipped: [] });
});

test("a campaign with no name is still counted, under its id", () => {
  const { rows } = mapInsights(page([row({ campaign_name: undefined }), row({ campaign_id: "7", campaign_name: "  " })]));
  assert.deepEqual(rows.map((r) => r.title), ["Meta · кампанія 120212345678900001", "Meta · кампанія 7"]);
});

test("a very long campaign name fits the journal's 200 characters", () => {
  const { rows } = mapInsights(page([row({ campaign_name: "х".repeat(400) })]));
  assert.equal(rows[0].title.length, 200);
  assert.ok(rows[0].title.startsWith("Meta · ххх"));
});

test("a partial page keeps the good rows and says which it skipped, and why", () => {
  const { rows, skipped } = mapInsights(
    page([
      row({ campaign_id: "ok" }),
      row({ campaign_id: undefined }),
      row({ campaign_id: "no-day", date_start: undefined }),
      row({ campaign_id: "bad-day", date_start: "20.09.2026", date_stop: "20.09.2026" }),
      row({ campaign_id: "week", date_stop: "2026-09-26" }),
      row({ campaign_id: "no-spend", spend: undefined }),
      row({ campaign_id: "odd-spend", spend: "twelve" }),
      "not an object",
      null,
    ])
  );
  assert.deepEqual(rows.map((r) => r.campaign), ["ok"]);
  assert.deepEqual(skipped, [
    { campaign: null, day: "2026-09-20", reason: "no campaign_id" },
    { campaign: "no-day", day: null, reason: "no date_start" },
    { campaign: "bad-day", day: null, reason: "no date_start" },
    { campaign: "week", day: "2026-09-20", reason: "not one day (2026-09-20..2026-09-26)" },
    { campaign: "no-spend", day: "2026-09-20", reason: "unreadable spend undefined" },
    { campaign: "odd-spend", day: "2026-09-20", reason: "unreadable spend twelve" },
    { campaign: null, day: null, reason: "not an object" },
    { campaign: null, day: null, reason: "not an object" },
  ]);
});

test("an account that is not in hryvnias fails the stage instead of storing dollars as hryvnias", () => {
  assert.throws(() => mapInsights(page([row(), row({ campaign_id: "2", account_currency: "USD" })])), /USD.*UAH/);
});

test("a row that does not say its currency fails the stage too — the amount means nothing without it", () => {
  assert.throws(() => mapInsights(page([row({ account_currency: undefined })])), /currency/);
});

test("a foreign-currency account is refused even on a day that spent nothing", () => {
  assert.throws(() => mapInsights(page([row({ spend: "0", account_currency: "EUR" })])), /EUR/);
});

test("pages merge into one batch, each campaign-day once, the later copy winning", () => {
  const a = mapInsights(page([row({ spend: "10.00" }), row({ campaign_id: "2", spend: "5.00" })])).rows;
  const b = mapInsights(page([row({ spend: "12.00", campaign_name: "Пояси — ретаргет (новий)" })])).rows;
  assert.deepEqual(
    mergeAdSpend([a, b]).map((r) => [r.campaign, r.amountKop, r.title]),
    [
      ["120212345678900001", 1_200, "Meta · Пояси — ретаргет (новий)"],
      ["2", 500, "Meta · Пояси — ретаргет"],
    ]
  );
});
