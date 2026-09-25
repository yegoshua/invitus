import assert from "node:assert/strict";
import { test } from "node:test";
import { membershipFromStatus } from "./membership.ts";

test("owners, admins and members are in", () => {
  for (const status of ["creator", "administrator", "member"]) {
    assert.equal(membershipFromStatus(status), "member");
  }
});

test("someone who left or was removed is out", () => {
  assert.equal(membershipFromStatus("left"), "not-member");
  assert.equal(membershipFromStatus("kicked"), "not-member");
});

test("a restricted user counts only while Telegram says they are still in", () => {
  assert.equal(membershipFromStatus("restricted", true), "member");
  assert.equal(membershipFromStatus("restricted", false), "not-member");
});

test("no status is not a no", () => {
  assert.equal(membershipFromStatus(undefined), "unknown");
});
