import assert from "node:assert/strict";
import { test } from "node:test";
import { adPlatformIn } from "./ad-warning.ts";

test("names the ad platform a title mentions, in any case", () => {
  assert.equal(adPlatformIn("Реклама Meta за вересень"), "Meta");
  assert.equal(adPlatformIn("google ads"), "Google");
  assert.equal(adPlatformIn("GOOGLE"), "Google");
});

test("Meta's other names count: Facebook, Instagram ads, and the Cyrillic spellings", () => {
  assert.equal(adPlatformIn("Facebook, поповнення"), "Meta");
  assert.equal(adPlatformIn("Фейсбук реклама"), "Meta");
  assert.equal(adPlatformIn("Гугл реклама"), "Google");
  assert.equal(adPlatformIn("Інстаграм таргет"), "Meta");
});

test("a word that merely contains the name is not a mention", () => {
  assert.equal(adPlatformIn("Metal buckles"), null);
  assert.equal(adPlatformIn("Metamorphosis"), null);
  assert.equal(adPlatformIn("Googled nothing"), null);
});

test("«мета» is an ordinary Ukrainian word, so it does not warn", () => {
  assert.equal(adPlatformIn("Мета закупівлі — нові пояси"), null);
});

test("an Instagram blogger is not Instagram ads: barter is entered by hand", () => {
  assert.equal(adPlatformIn("Блогер з Instagram, бартер"), null);
});

test("nothing to warn about", () => {
  assert.equal(adPlatformIn("Пакування: коробки, стрічка"), null);
  assert.equal(adPlatformIn(""), null);
});
