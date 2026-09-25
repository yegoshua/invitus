import assert from "node:assert/strict";
import { test } from "node:test";
import { adAccountId, insightsPages, insightsUrl } from "./meta-client.ts";

const TOKEN = "EAAB-secret-token";

test("the ad account id is accepted with or without its act_ prefix, and nothing else", () => {
  assert.equal(adAccountId("1234567890"), "act_1234567890");
  assert.equal(adAccountId(" act_1234567890 "), "act_1234567890");
  assert.throws(() => adAccountId("act_12/../me"), /META_AD_ACCOUNT_ID/);
  assert.throws(() => adAccountId(""), /META_AD_ACCOUNT_ID/);
});

test("the request asks for spend per campaign per day over exactly the window", () => {
  const url = new URL(insightsUrl("act_1", { from: "2026-08-29", to: "2026-09-25" }, TOKEN));
  assert.equal(url.origin + url.pathname, "https://graph.facebook.com/v26.0/act_1/insights");
  assert.equal(url.searchParams.get("level"), "campaign");
  assert.equal(url.searchParams.get("time_increment"), "1");
  assert.deepEqual(JSON.parse(url.searchParams.get("time_range")!), { since: "2026-08-29", until: "2026-09-25" });
  assert.deepEqual(url.searchParams.get("fields")!.split(","), ["campaign_id", "campaign_name", "spend", "account_currency"]);
});

function fakeFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: string[] = [];
  const impl = async (url: string | URL | Request) => {
    calls.push(String(url));
    const r = responses.shift();
    if (!r) throw new Error("unexpected request");
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  };
  return { calls, impl: impl as typeof fetch };
}

async function collect(it: AsyncIterable<unknown>) {
  const out: unknown[] = [];
  for await (const x of it) out.push(x);
  return out;
}

const WINDOW = { from: "2026-09-01", to: "2026-09-25" };

test("pages are followed through paging.next until there is none", async () => {
  const next = `https://graph.facebook.com/v26.0/act_1/insights?access_token=${TOKEN}&after=MQZDZD`;
  const f = fakeFetch([{ body: { data: [1], paging: { next } } }, { body: { data: [2], paging: {} } }]);
  const pages = await collect(insightsPages({ token: TOKEN, account: "act_1", window: WINDOW, fetch: f.impl }));
  assert.deepEqual(pages, [{ data: [1], paging: { next } }, { data: [2], paging: {} }]);
  assert.equal(f.calls[1], next);
});

test("a next link to anywhere but the Graph API is not followed — it would carry the token there", async () => {
  const f = fakeFetch([{ body: { data: [], paging: { next: "https://evil.example/steal?access_token=x" } } }]);
  await assert.rejects(collect(insightsPages({ token: TOKEN, account: "act_1", window: WINDOW, fetch: f.impl })), /next page/);
  assert.equal(f.calls.length, 1);
});

test("Meta's error is reported by its message and code, and the token never appears in it", async () => {
  const f = fakeFetch([
    {
      status: 400,
      body: { error: { message: `Error validating access token ${TOKEN}`, type: "OAuthException", code: 190, fbtrace_id: "A1" } },
    },
  ]);
  await assert.rejects(collect(insightsPages({ token: TOKEN, account: "act_1", window: WINDOW, fetch: f.impl })), (e: Error) => {
    assert.match(e.message, /Meta 400: Error validating access token \[token\] \(code 190\)/);
    assert.ok(!e.message.includes(TOKEN));
    return true;
  });
});

test("a network failure is reported without the URL, which holds the token", async () => {
  const impl = (async (url: string) => {
    throw new TypeError(`fetch failed for ${url}`);
  }) as unknown as typeof fetch;
  await assert.rejects(collect(insightsPages({ token: TOKEN, account: "act_1", window: WINDOW, fetch: impl })), (e: Error) => {
    assert.ok(!e.message.includes(TOKEN));
    return true;
  });
});
