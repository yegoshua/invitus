import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFeeRates } from "./rates-input.ts";

const METHODS = [2, 6, 9];

test("percents as people type them: a comma, a dot, a % sign, a zero", () => {
  assert.deepEqual(parseFeeRates({ rate_2: "1,3", rate_6: "0", rate_9: " 3.5 % " }, METHODS), {
    ok: true,
    value: { 2: 1.3, 6: 0, 9: 3.5 },
  });
});

test("each bad field says what is wrong with it", () => {
  assert.deepEqual(parseFeeRates({ rate_2: "", rate_6: "-1", rate_9: "1.255" }, METHODS), {
    ok: false,
    errors: {
      2: "Вкажи ставку — 0, якщо комісії немає",
      6: "Ставка — число від 0 до 99,99",
      9: "До сотих: напр., 1,25",
    },
  });
  assert.deepEqual(parseFeeRates({ rate_2: "100", rate_6: "abc", rate_9: "1" }, METHODS), {
    ok: false,
    errors: { 2: "Ставка — число від 0 до 99,99", 6: "Ставка — число від 0 до 99,99" },
  });
});

test("only the methods asked about are read; a forged extra field is ignored", () => {
  const r = parseFeeRates({ rate_2: "1", rate_6: "0", rate_9: "2", rate_77: "50" }, METHODS);
  assert.deepEqual(r, { ok: true, value: { 2: 1, 6: 0, 9: 2 } });
});
