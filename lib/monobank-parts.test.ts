import { test } from "node:test";
import assert from "node:assert/strict";
import { signPartsBody, verifyPartsSignature } from "./monobank-parts.ts";

// RFC-style HMAC-SHA256 vector: key "key", message "The quick brown fox jumps
// over the lazy dog" → f7bc83f4…3cd8. Monobank's signature is that digest in
// base64, so the expected value is derived from the published hex, not from
// the function under test.
const KEY = "key";
const MESSAGE = "The quick brown fox jumps over the lazy dog";
const KNOWN_HEX =
  "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8";
const KNOWN_BASE64 = Buffer.from(KNOWN_HEX, "hex").toString("base64");

test("the signature is base64 of HMAC-SHA256 over the body bytes", () => {
  assert.equal(signPartsBody(MESSAGE, KEY), KNOWN_BASE64);
});

test("UTF-8 bytes are what get signed, not UTF-16 code units", () => {
  const cyrillic = '{"name":"Пояс"}';
  const latin = '{"name":"Poyas"}';
  assert.notEqual(signPartsBody(cyrillic, KEY), signPartsBody(latin, KEY));
  // Stable across calls — a signature is a function of the body alone.
  assert.equal(signPartsBody(cyrillic, KEY), signPartsBody(cyrillic, KEY));
});

test("a callback is accepted only with the matching signature", () => {
  const body = '{"order_id":"abc","state":"FAIL","order_sub_state":"REJECTED_BY_CLIENT"}';
  const good = signPartsBody(body, KEY);
  assert.equal(verifyPartsSignature(body, good, KEY), true);
  // Whitespace around the header value is tolerated; anything else is not.
  assert.equal(verifyPartsSignature(body, ` ${good}\n`, KEY), true);
  assert.equal(verifyPartsSignature(body, good, "other-key"), false);
  assert.equal(verifyPartsSignature(`${body} `, good, KEY), false);
  assert.equal(verifyPartsSignature(body, null, KEY), false);
  assert.equal(verifyPartsSignature(body, "", KEY), false);
  // A wrong-length header must be a false, never a throw.
  assert.equal(verifyPartsSignature(body, "short", KEY), false);
});
