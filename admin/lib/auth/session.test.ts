import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeSession,
  encodeSession,
  isStale,
  needsRecheck,
  RECHECK_AFTER_SECONDS,
  SESSION_MAX_AGE_SECONDS,
  STALE_AFTER_SECONDS,
  type Session,
} from "./session.ts";

const SECRET = "test-secret-that-is-long-enough";
const NOW = 1_780_000_000;
const session: Session = { userId: 42, name: "Ігор", issuedAt: NOW, checkedAt: NOW };

test("a cookie we issued reads back", () => {
  assert.deepEqual(decodeSession(encodeSession(session, SECRET), SECRET, NOW + 60), session);
});

test("a cookie with an edited payload is refused", () => {
  const [, signature] = encodeSession(session, SECRET).split(".");
  const forged = Buffer.from(JSON.stringify({ ...session, userId: 1 })).toString("base64url");
  assert.equal(decodeSession(`${forged}.${signature}`, SECRET, NOW), null);
});

test("a cookie signed with another secret is refused", () => {
  assert.equal(decodeSession(encodeSession(session, "another-secret"), SECRET, NOW), null);
});

test("garbage is refused, not thrown on", () => {
  for (const token of [undefined, "", "abc", "a.b.c", "e30.", "%%%.%%%"]) {
    assert.equal(decodeSession(token, SECRET, NOW), null);
  }
});

test("a session ends a week after login however recently it was checked", () => {
  const token = encodeSession({ ...session, checkedAt: NOW + SESSION_MAX_AGE_SECONDS }, SECRET);
  assert.equal(decodeSession(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS + 1), null);
});

test("membership is re-asked after a day, and a two-day-old check is stale", () => {
  assert.equal(needsRecheck(session, NOW + RECHECK_AFTER_SECONDS), false);
  assert.equal(needsRecheck(session, NOW + RECHECK_AFTER_SECONDS + 1), true);
  assert.equal(isStale(session, NOW + STALE_AFTER_SECONDS), false);
  assert.equal(isStale(session, NOW + STALE_AFTER_SECONDS + 1), true);
});
