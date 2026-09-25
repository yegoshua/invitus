// Strip mapping: where a Belt design goes in the Custom base's texture.
//
// The model's printed face is one UV island — a long, thin rectangle laid
// somewhere in the texture atlas (on the Dragon belt, diagonally across a
// 2048² image). Paint the design into that rectangle and the 3D belt wears it,
// with the model's own lever, stitching and edges untouched.
//
// The rectangle is found, not written down: the island that runs longest is
// the outside face, since the outside of a ring is longer than its inside.
// A re-exported model with a shuffled atlas still works; numbers copied from
// one export would silently paint the design onto the next one's rivets.

type Vec = [number, number];

export interface PrintStrip {
  /** UV corner where both `along` and `across` start. */
  origin: Vec;
  /** Unit vector along the strip, in UV. */
  along: Vec;
  /** Unit vector across the strip — `along` turned a quarter to the left. */
  across: Vec;
  /** Extent along `along`, in UV units. */
  length: number;
  /** Extent along `across`, in UV units. */
  width: number;
}

/**
 * Splits the mesh into UV islands and measures the longest.
 *
 * Vertices at the same UV are welded first: compressed models split a vertex
 * wherever its normal changes, and without the weld one island reads as dozens.
 */
export function findPrintStrip(
  uv: ArrayLike<number>,
  index: ArrayLike<number> | null,
): PrintStrip | null {
  const count = uv.length / 2;
  if (count === 0) return null;

  const parent = Array.from({ length: count }, (_, i) => i);
  const root = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const join = (a: number, b: number) => {
    parent[root(a)] = root(b);
  };

  const seen = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const key = `${uv[2 * i].toFixed(5)},${uv[2 * i + 1].toFixed(5)}`;
    const first = seen.get(key);
    if (first === undefined) seen.set(key, i);
    else join(i, first);
  }

  const triangles = index ? index.length : count;
  const vertex = (k: number) => (index ? index[k] : k);
  for (let k = 0; k + 2 < triangles; k += 3) {
    join(vertex(k), vertex(k + 1));
    join(vertex(k + 1), vertex(k + 2));
  }

  const islands = new Map<number, number[]>();
  for (let i = 0; i < count; i++) {
    const r = root(i);
    const members = islands.get(r);
    if (members) members.push(i);
    else islands.set(r, [i]);
  }

  let best: PrintStrip | null = null;
  for (const members of islands.values()) {
    const strip = measure(uv, members);
    if (!best || strip.length > best.length) best = strip;
  }
  return best;
}

/** The island's bounding rectangle, aligned with its own principal axis. */
function measure(uv: ArrayLike<number>, members: number[]): PrintStrip {
  let mu = 0;
  let mv = 0;
  for (const i of members) {
    mu += uv[2 * i];
    mv += uv[2 * i + 1];
  }
  mu /= members.length;
  mv /= members.length;

  let cuu = 0;
  let cvv = 0;
  let cuv = 0;
  for (const i of members) {
    const du = uv[2 * i] - mu;
    const dv = uv[2 * i + 1] - mv;
    cuu += du * du;
    cvv += dv * dv;
    cuv += du * dv;
  }
  const angle = 0.5 * Math.atan2(2 * cuv, cuu - cvv);
  let along: Vec = [Math.cos(angle), Math.sin(angle)];
  // An axis has no direction of its own; fix one so "reverse" in a
  // StripOrientation means the same thing on every run.
  if (along[0] < -1e-9 || (Math.abs(along[0]) <= 1e-9 && along[1] < 0)) {
    along = [-along[0], -along[1]];
  }
  const across: Vec = [-along[1], along[0]];

  let a0 = Infinity;
  let a1 = -Infinity;
  let c0 = Infinity;
  let c1 = -Infinity;
  for (const i of members) {
    const u = uv[2 * i];
    const v = uv[2 * i + 1];
    const a = u * along[0] + v * along[1];
    const c = u * across[0] + v * across[1];
    a0 = Math.min(a0, a);
    a1 = Math.max(a1, a);
    c0 = Math.min(c0, c);
    c1 = Math.max(c1, c);
  }

  return {
    origin: [a0 * along[0] + c0 * across[0], a0 * along[1] + c0 * across[1]],
    along,
    across,
    length: a1 - a0,
    width: c1 - c0,
  };
}

/**
 * Which way round the design lies on the strip. PCA finds the strip's axis but
 * not which end is which, and only looking at the model says where 0 cm and the
 * top edge actually are — so this is data about a particular model, kept with
 * the Custom base, not something to guess here.
 */
export interface StripOrientation {
  reverseLength: boolean;
  reverseWidth: boolean;
}

/**
 * A canvas transform — `[a, b, c, d, e, f]` for `setTransform` — that maps the
 * unit square of a Belt design (x along the strip, y across it, both 0 → 1)
 * onto the strip in an atlas `atlasSize` pixels square. Draw the design as a
 * 1 × 1 image under it.
 */
export function designToAtlas(
  strip: PrintStrip,
  orientation: StripOrientation,
  atlasSize: number,
): readonly [number, number, number, number, number, number] {
  const sx = orientation.reverseLength ? -1 : 1;
  const sy = orientation.reverseWidth ? -1 : 1;
  const L = strip.length * sx;
  const W = strip.width * sy;
  const u0 =
    strip.origin[0] +
    (orientation.reverseLength ? strip.length * strip.along[0] : 0) +
    (orientation.reverseWidth ? strip.width * strip.across[0] : 0);
  const v0 =
    strip.origin[1] +
    (orientation.reverseLength ? strip.length * strip.along[1] : 0) +
    (orientation.reverseWidth ? strip.width * strip.across[1] : 0);
  const P = atlasSize;
  return [
    P * L * strip.along[0],
    P * L * strip.along[1],
    P * W * strip.across[0],
    P * W * strip.across[1],
    P * u0,
    P * v0,
  ];
}

/**
 * The inverse of `designToAtlas`, sized for a `width` × `height` canvas: set it
 * as the transform and draw the atlas at (0, 0), and the canvas holds the
 * strip as a flat Belt design, the right way round. It is how the model's own
 * printed face becomes the example the editor shows before an upload.
 */
export function atlasToDesign(
  strip: PrintStrip,
  orientation: StripOrientation,
  atlasSize: number,
  width: number,
  height: number,
): readonly [number, number, number, number, number, number] {
  const [a, b, c, d, e, f] = designToAtlas(strip, orientation, atlasSize);
  const det = a * d - b * c;
  return [
    (width * d) / det,
    (height * -b) / det,
    (width * -c) / det,
    (height * a) / det,
    (width * (c * f - d * e)) / det,
    (height * (b * e - a * f)) / det,
  ];
}
