import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { customRequestSchema, isArtworkPathname } from "./custom-request.ts";

const valid = {
  name: "Олена Коваль",
  phone: "+380 67 123 45 67",
  size: "M",
  sizeLabel: "72.5-90 см",
  comment: "Хочу напис знизу",
  artwork: {
    pathname: "custom-belt/gym-Xy12ab.png",
    fileName: "gym.png",
    width: 1536,
    height: 1024,
  },
  placement: { centerX: 50, centerY: 5, width: 15, background: "#111111" },
};

/** The first error message, or null when the request is accepted. */
function problem(input: unknown): string | null {
  const result = customRequestSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
}

describe("customRequestSchema", () => {
  it("accepts a complete request", () => {
    assert.equal(problem(valid), null);
  });

  it("asks for a name", () => {
    assert.equal(problem({ ...valid, name: "  " }), "Вкажи ім'я");
  });

  it("rejects a phone number that cannot be dialled", () => {
    assert.equal(problem({ ...valid, phone: "12345" }), "Невірний номер телефону");
  });

  it("takes «Не знаю» for a size", () => {
    assert.equal(problem({ ...valid, size: "unknown", sizeLabel: undefined }), null);
  });

  it("asks for a size — or «Не знаю» — rather than none at all", () => {
    assert.equal(problem({ ...valid, size: "" }), "Обери розмір або «Не знаю»");
  });

  it("will not point at a file outside the custom-belt uploads", () => {
    // The endpoint reads this file and posts it to the team's chat; a path
    // chosen by the browser must not be able to reach anything else in the store.
    const artwork = { ...valid.artwork, pathname: "videos/hero.mp4" };
    assert.ok(problem({ ...valid, artwork }));
    const sneaky = { ...valid.artwork, pathname: "custom-belt/../videos/hero.mp4" };
    assert.ok(problem({ ...valid, artwork: sneaky }));
  });

  it("rejects a background that is not a colour", () => {
    const placement = { ...valid.placement, background: "red; x" };
    assert.ok(problem({ ...valid, placement }));
  });

  it("rejects an Artwork with no size", () => {
    assert.ok(problem({ ...valid, artwork: { ...valid.artwork, width: 0 } }));
  });
});

describe("isArtworkPathname", () => {
  it("accepts a file directly in custom-belt/", () => {
    assert.equal(isArtworkPathname("custom-belt/gym-Xy12ab.png"), true);
  });

  it("refuses sub-folders, so an upload can never be one the request would then reject", () => {
    assert.equal(isArtworkPathname("custom-belt/a/b.png"), false);
  });

  it("refuses anything outside the folder or climbing out of it", () => {
    assert.equal(isArtworkPathname("videos/hero.mp4"), false);
    assert.equal(isArtworkPathname("custom-belt/../videos/hero.mp4"), false);
    assert.equal(isArtworkPathname("custom-belt/.."), false);
  });
});
