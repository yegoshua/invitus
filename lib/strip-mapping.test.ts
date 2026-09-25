import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { designToAtlas, findPrintStrip } from "./strip-mapping.ts";

type Vec = [number, number];

/** A UV island: a rectangle, as two triangles, appended to `mesh`. */
function addRect(
  mesh: { uv: number[]; index: number[] },
  corners: [Vec, Vec, Vec, Vec],
) {
  const base = mesh.uv.length / 2;
  for (const [u, v] of corners) mesh.uv.push(u, v);
  mesh.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/** A rectangle given in the frame rotated by 45° — how the Dragon atlas lays its strip. */
function diagonal(s0: number, s1: number, t0: number, t1: number): [Vec, Vec, Vec, Vec] {
  const uv = (s: number, t: number): Vec => [(s + t) / Math.SQRT2, (t - s) / Math.SQRT2];
  return [uv(s0, t0), uv(s1, t0), uv(s1, t1), uv(s0, t1)];
}

const close = (actual: number, expected: number, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≉ ${expected}`);

describe("findPrintStrip", () => {
  it("measures an axis-aligned strip", () => {
    const mesh = { uv: [] as number[], index: [] as number[] };
    addRect(mesh, [[0.1, 0.45], [0.9, 0.45], [0.9, 0.53], [0.1, 0.53]]);
    const strip = findPrintStrip(mesh.uv, mesh.index)!;
    close(strip.length, 0.8);
    close(strip.width, 0.08);
  });

  it("finds the strip laid diagonally, and ignores the shorter islands beside it", () => {
    const mesh = { uv: [] as number[], index: [] as number[] };
    addRect(mesh, diagonal(-0.42, 0.45, 0.5, 0.6)); // the inside of the belt
    addRect(mesh, diagonal(-0.615, 0.624, 0.641, 0.767)); // the printed face
    addRect(mesh, [[0.1, 0.35], [0.16, 0.35], [0.16, 0.41], [0.1, 0.41]]); // a rivet
    const strip = findPrintStrip(mesh.uv, mesh.index)!;
    close(strip.length, 1.239);
    close(strip.width, 0.126);
  });

  it("returns null for a mesh with no geometry", () => {
    assert.equal(findPrintStrip([], []), null);
  });
});

describe("designToAtlas", () => {
  /** Where a point of the design, as fractions of length and width, lands in atlas pixels. */
  const apply = ([a, b, c, d, e, f]: readonly number[], x: number, y: number): Vec => [
    a * x + c * y + e,
    b * x + d * y + f,
  ];
  const near = (actual: Vec, expected: Vec, eps = 1e-6) => {
    close(actual[0], expected[0], eps);
    close(actual[1], expected[1], eps);
  };

  const flat = { uv: [] as number[], index: [] as number[] };
  addRect(flat, [[0.1, 0.45], [0.9, 0.45], [0.9, 0.53], [0.1, 0.53]]);
  const flatStrip = findPrintStrip(flat.uv, flat.index)!;

  it("lays the design corner to corner over the strip", () => {
    const m = designToAtlas(flatStrip, { reverseLength: false, reverseWidth: false }, 1000);
    near(apply(m, 0, 0), [100, 450]);
    near(apply(m, 1, 0), [900, 450]);
    near(apply(m, 1, 1), [900, 530]);
  });

  it("turns the design end for end when the model wants it that way", () => {
    const m = designToAtlas(flatStrip, { reverseLength: true, reverseWidth: true }, 1000);
    near(apply(m, 0, 0), [900, 530]);
    near(apply(m, 1, 0), [100, 530]);
    near(apply(m, 1, 1), [100, 450]);
  });

  it("puts the Dragon's 0 cm, top edge where the prototype found it", () => {
    const mesh = { uv: [] as number[], index: [] as number[] };
    addRect(mesh, diagonal(-0.615, 0.624, 0.641, 0.767));
    const strip = findPrintStrip(mesh.uv, mesh.index)!;
    const m = designToAtlas(strip, { reverseLength: true, reverseWidth: true }, 1);
    near(apply(m, 0, 0), [0.98357, 0.10112], 1e-4);
    // ≈ 1 : 10, the physical 10 × 100 cm.
    close(strip.length / strip.width, 9.83, 0.01);
  });
});
