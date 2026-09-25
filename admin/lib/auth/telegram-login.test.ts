import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import { LOGIN_MAX_AGE_SECONDS, verifyTelegramLogin } from "./telegram-login.ts";

const BOT_TOKEN = "123456:TEST-token";
const NOW = 1_780_000_000;

// Signs the way Telegram does, so the test fails if our reading of the spec
// drifts from the spec rather than from itself.
function signed(fields: Record<string, string>, token = BOT_TOKEN) {
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("\n");
  const secret = createHash("sha256").update(token).digest();
  return { ...fields, hash: createHmac("sha256", secret).update(check).digest("hex") };
}

const fields = { id: "42", first_name: "Ігор", username: "owner", auth_date: String(NOW - 5) };

test("a payload Telegram signed is accepted", () => {
  const result = verifyTelegramLogin(signed(fields), BOT_TOKEN, NOW);
  assert.deepEqual(result, {
    ok: true,
    user: { id: 42, firstName: "Ігор", lastName: undefined, username: "owner" },
  });
});

test("changing any field breaks the signature", () => {
  const payload = { ...signed(fields), id: "43" };
  assert.deepEqual(verifyTelegramLogin(payload, BOT_TOKEN, NOW), { ok: false, reason: "bad-signature" });
});

test("a payload signed by another bot is refused", () => {
  const payload = signed(fields, "999:other-bot");
  assert.deepEqual(verifyTelegramLogin(payload, BOT_TOKEN, NOW), { ok: false, reason: "bad-signature" });
});

test("a malformed hash is refused, not thrown on", () => {
  const payload = { ...fields, hash: "not-hex" };
  assert.deepEqual(verifyTelegramLogin(payload, BOT_TOKEN, NOW), { ok: false, reason: "bad-signature" });
});

test("an old login link is refused even with a valid signature", () => {
  const old = signed({ ...fields, auth_date: String(NOW - LOGIN_MAX_AGE_SECONDS - 1) });
  assert.deepEqual(verifyTelegramLogin(old, BOT_TOKEN, NOW), { ok: false, reason: "expired" });
});

test("a payload without a hash is refused", () => {
  assert.deepEqual(verifyTelegramLogin(fields, BOT_TOKEN, NOW), { ok: false, reason: "missing-fields" });
});
