import assert from "node:assert/strict";
import { test } from "node:test";
import { nbuUsdRate, nbuUrl } from "./nbu.ts";

const answer = (rate: number, ddmmyyyy: string) => [{ r030: 840, cc: "USD", rate, exchangedate: ddmmyyyy }];

test("the NBU is asked for the dollar on the given day", () => {
  assert.equal(nbuUrl("2026-09-05"), "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=20260905&json");
});

test("the day's own rate is used when the NBU has one", async () => {
  const asked: string[] = [];
  const rate = await nbuUsdRate("2026-09-05", async (url) => {
    asked.push(url);
    return answer(44.7273, "05.09.2026");
  });
  assert.deepEqual(rate, { rate: 44.7273, day: "2026-09-05" });
  assert.equal(asked.length, 1);
});

test("an empty answer falls back to the latest earlier day, within a week", async () => {
  const rate = await nbuUsdRate("2026-09-07", async (url) =>
    url.includes("date=20260905") ? answer(44.7273, "05.09.2026") : []
  );
  assert.deepEqual(rate, { rate: 44.7273, day: "2026-09-05" });
});

test("a week without a rate is no rate", async () => {
  const asked: string[] = [];
  await assert.rejects(
    nbuUsdRate("2026-09-07", async (url) => {
      asked.push(url);
      return [];
    }),
    /2026-09-07/
  );
  assert.equal(asked.length, 8, "the day itself and the seven before it");
});

test("a failed request is not papered over with an older rate", async () => {
  let calls = 0;
  await assert.rejects(
    nbuUsdRate("2026-09-07", async () => {
      calls += 1;
      throw new Error("NBU answered 503");
    }),
    /503/
  );
  assert.equal(calls, 1);
});
