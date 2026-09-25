import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  centered,
  fillStrip,
  fitInStrip,
  movedBy,
  printQuality,
  scaledAround,
  zoneAt,
} from "./belt-design.ts";
import { CUSTOM_BASE } from "./custom-base.ts";

describe("fillStrip", () => {
  it("stretches a square Artwork across the whole 100 cm, centred", () => {
    const p = fillStrip({ width: 1000, height: 1000 }, "#111111");
    assert.equal(p.width, 100);
    assert.equal(p.centerX, 50);
    assert.equal(p.centerY, 5);
    assert.equal(p.background, "#111111");
  });

  it("covers the width, not the length, when the Artwork is wider than 10:1", () => {
    // 30:1 — a 10 cm tall strip makes it 300 cm long; 200 cm hang off the ends.
    assert.equal(fillStrip({ width: 3000, height: 100 }, "#000").width, 300);
  });
});

describe("fitInStrip", () => {
  it("shows a square Artwork whole, as a 10 cm medallion in the middle", () => {
    const p = fitInStrip({ width: 1000, height: 1000 }, "#e74223");
    assert.equal(p.width, 10);
    assert.equal(p.centerX, 50);
    assert.equal(p.centerY, 5);
  });

  it("runs a 30:1 Artwork end to end", () => {
    assert.equal(fitInStrip({ width: 3000, height: 100 }, "#000").width, 100);
  });
});

describe("printQuality", () => {
  const at = (width: number) => ({ centerX: 50, centerY: 5, width, background: "#000" });

  it("passes a 1000 px logo printed 15 cm wide (~169 DPI)", () => {
    const q = printQuality({ width: 1000, height: 1000 }, at(15));
    assert.equal(Math.round(q.dpi), 169);
    assert.equal(q.verdict, "ok");
  });

  it("warns about a 1024 px AI image stretched over the whole belt (~26 DPI)", () => {
    const q = printQuality({ width: 1024, height: 1024 }, at(100));
    assert.equal(Math.round(q.dpi), 26);
    assert.equal(q.verdict, "low");
  });

  it("counts exactly 100 DPI as enough", () => {
    // 1000 px over 25.4 cm is 10 inches.
    assert.equal(printQuality({ width: 1000, height: 100 }, at(25.4)).verdict, "ok");
  });
});

describe("gestures", () => {
  const logo = { centerX: 50, centerY: 5, width: 10, background: "#000" };

  it("drags the Artwork by the distance the finger moved", () => {
    const p = movedBy(logo, 12, -1.5);
    assert.equal(p.centerX, 62);
    assert.equal(p.centerY, 3.5);
    assert.equal(p.width, 10);
  });

  it("zooms around the pinch point, so what is under the fingers stays there", () => {
    // Doubling around x = 60: the centre, 10 cm left of the fingers, ends up 20 cm left.
    const p = scaledAround(logo, 2, 60, 5);
    assert.equal(p.width, 20);
    assert.equal(p.centerX, 40);
    assert.equal(p.centerY, 5);
  });

  it("never shrinks the Artwork to nothing", () => {
    assert.ok(scaledAround(logo, 0.0001, 50, 5).width >= 1);
  });

  it("«По центру» brings the Artwork back to the middle without resizing it", () => {
    const p = centered({ ...logo, centerX: 81, centerY: 2, width: 33 });
    assert.deepEqual(p, { centerX: 50, centerY: 5, width: 33, background: "#000" });
  });
});

describe("Print zones of the Custom base", () => {
  const zones = CUSTOM_BASE.printZones;

  it("cover the whole 100 cm, end to end, with no gaps or overlaps", () => {
    assert.equal(zones[0].from, 0);
    assert.equal(zones.at(-1)!.to, 100);
    for (let i = 1; i < zones.length; i++) assert.equal(zones[i].from, zones[i - 1].to);
  });

  it("put the lifter's back in the middle of the strip", () => {
    assert.equal(zoneAt(zones, 50)?.kind, "back");
    assert.equal(zoneAt(zones, 47)?.kind, "back");
  });

  it("hide both ends under the lever at the front", () => {
    assert.equal(zoneAt(zones, 3)?.kind, "under-buckle");
    assert.equal(zoneAt(zones, 97)?.kind, "under-buckle");
  });

  it("call what lies between them the sides", () => {
    assert.equal(zoneAt(zones, 20)?.kind, "side");
    assert.equal(zoneAt(zones, 75)?.kind, "side");
  });

  it("know nothing outside the strip", () => {
    assert.equal(zoneAt(zones, -5), undefined);
    assert.equal(zoneAt(zones, 130), undefined);
  });
});
