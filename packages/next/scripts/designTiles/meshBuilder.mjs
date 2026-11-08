// Shared geometry for the scale ladder's models (plan 4b Task 17b): a mesh
// builder in design coordinates (E, N, U, float64) with flat-shaded faces,
// per-vertex colours and feature ids, and the sag rule that keeps every
// reprojected face on the curved Earth.
//
// The sag rule (owner, 2026-11-07: "no polygon cuts through the ground"): a
// reprojected edge is a straight chord between two reprojected vertices, so
// an edge of length d sags about d²/8R below the curved surface at its
// middle. Every face the builder emits is subdivided until each of its
// edges is at most `maxEdge` long; the ladder's tree sets `maxEdge` from the
// tile's geometric error, so the sag is within it.
//
// Plain Node, no dependencies; deterministic (`random` is seeded).

/**
 * The smallest radius of curvature on the WGS 84 ellipsoid, a(1 − e²), the
 * meridian's at the equator (metres): the sag rule's R, so the rule holds at
 * every latitude and in every direction.
 */
export const MIN_RADIUS = 6_378_137 * (1 - 1 / 298.257223563) ** 2;

/**
 * The ground layer stack, metres: every flat surface that lies on another
 * (a road on a site plan, paint on a road) is a whole number of layers
 * above it, never level with a surface of another colour. Each model
 * stacks its own grounds: layer 0 the base (grass, site plan, gravel),
 * then the surfaces on it, then the paint. 5 cm is far above the worst
 * sag (1 mm at the leaves, 2^l mm at level l) and invisible at any scale.
 */
export const LAYER_METRES = 0.05;

/** The sag at the middle of a chord this many metres long (d²/8R), metres. */
export const edgeSag = (metres) => (metres * metres) / (8 * MIN_RADIUS);

/** The longest chord whose sag is at most `errorMetres` (√(8R·e)), metres. */
export const longestEdgeFor = (errorMetres) =>
  Math.sqrt(8 * MIN_RADIUS * errorMetres);

/** An sRGB colour ("#rrggbb") as linear RGBA, as glTF's COLOR_0 wants. */
export function srgb(hex, alpha = 1) {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift) => {
    const c = ((value >> shift) & 0xff) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel(16), channel(8), channel(0), alpha];
}

/** A seeded generator of numbers in [0, 1) (mulberry32): the same seed, the same model. */
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** One of `items`, by `rand`. */
export const pick = (rand, items) => items[Math.floor(rand() * items.length)];
/** A number in [lo, hi), by `rand`. */
export const between = (rand, lo, hi) => lo + (hi - lo) * rand();

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const lerp = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.hypot(a[0], a[1], a[2]);
const normalize = (a) => scale(a, 1 / length(a));
const UP = [0, 0, 1];

/**
 * A horizontal frame turned `angle` radians counterclockwise from design
 * east: `u` along, `v` across (to the left of `u`), `w` up.
 */
export function frameAt(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { u: [c, s, 0], v: [-s, c, 0], w: UP };
}

/** A point `along` and `across` from `at` ([e, n]) in a frame, at height z. */
export const placeIn = (frame, at, along, across, z) => [
  at[0] + frame.u[0] * along + frame.v[0] * across,
  at[1] + frame.u[1] * along + frame.v[1] * across,
  z,
];

/**
 * Builds one tile's mesh. Every face is flat-shaded (its own vertices and
 * normal), coloured per vertex, and split until no edge is longer than
 * `maxEdge` design units. `feature` registers a feature once per tile.
 */
export class MeshBuilder {
  /** @param {number} maxEdge design units; Infinity for no subdivision. */
  constructor(maxEdge) {
    this.maxEdge = maxEdge;
    this.design = [];
    this.normals = [];
    this.colors = [];
    this.ids = [];
    this.indices = [];
    this.features = [];
    this.featureIndex = new Map();
  }

  /** The tile-local id of a feature ({ name, kind }), registered once. */
  feature(feature) {
    let id = this.featureIndex.get(feature);
    if (id === undefined) {
      id = this.features.length;
      if (id >= 65_536) {
        throw new Error("MeshBuilder: more than 65,536 features in a tile");
      }
      this.features.push({ name: feature.name, kind: feature.kind });
      this.featureIndex.set(feature, id);
    }
    return id;
  }

  vertex(p, normal, color, id) {
    this.design.push(p[0], p[1], p[2]);
    this.normals.push(normal[0], normal[1], normal[2]);
    this.colors.push(color[0], color[1], color[2], color[3]);
    this.ids.push(id);
    return this.ids.length - 1;
  }

  /**
   * A triangle, counterclockwise seen from the side it faces; split into
   * four at its edges' midpoints until every edge is at most √3/2 of
   * `maxEdge`. A face's interior sags up to r²/2R (r its circumradius):
   * for a quad cell's right triangles that is its diagonal's d²/8R, but up
   * to 4/3 of the longest edge's for an equilateral one, which the √3/2
   * makes up.
   */
  triangle(a, b, c, color, feature, normal) {
    const n = normal ?? normalize(cross(sub(b, a), sub(c, a)));
    const longest = Math.max(
      length(sub(b, a)),
      length(sub(c, b)),
      length(sub(a, c)),
    );
    if (longest > (this.maxEdge * Math.sqrt(3)) / 2) {
      const ab = lerp(a, b, 0.5);
      const bc = lerp(b, c, 0.5);
      const ca = lerp(c, a, 0.5);
      this.triangle(a, ab, ca, color, feature, n);
      this.triangle(ab, b, bc, color, feature, n);
      this.triangle(ca, bc, c, color, feature, n);
      this.triangle(ab, bc, ca, color, feature, n);
      return;
    }
    const id = this.feature(feature);
    const first = this.vertex(a, n, color, id);
    this.vertex(b, n, color, id);
    this.vertex(c, n, color, id);
    this.indices.push(first, first + 1, first + 2);
  }

  /**
   * A planar quad a → b → c → d, counterclockwise seen from the side it
   * faces, as a grid of cells small enough that every edge (the cells'
   * diagonals too) is at most `maxEdge`.
   */
  quad(a, b, c, d, color, feature) {
    const n = normalize(cross(sub(b, a), sub(d, a)));
    // Cells at most maxEdge/1.5 on a side: their diagonals are under maxEdge.
    const cell = this.maxEdge / 1.5;
    const nu = Math.max(
      1,
      Math.ceil(Math.max(length(sub(b, a)), length(sub(c, d))) / cell),
    );
    const nv = Math.max(
      1,
      Math.ceil(Math.max(length(sub(d, a)), length(sub(c, b))) / cell),
    );
    const id = this.feature(feature);
    const first = this.ids.length;
    for (let j = 0; j <= nv; j++) {
      const left = lerp(a, d, j / nv);
      const right = lerp(b, c, j / nv);
      for (let i = 0; i <= nu; i++) {
        this.vertex(lerp(left, right, i / nu), n, color, id);
      }
    }
    const row = nu + 1;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const k = first + j * row + i;
        this.indices.push(k, k + 1, k + row + 1, k, k + row + 1, k + row);
      }
    }
  }

  /** A convex polygon (counterclockwise seen from the side it faces), as a fan. */
  polygon(points, color, feature) {
    const n = normalize(
      points.reduce(
        (sum, p, i) => add(sum, cross(p, points[(i + 1) % points.length])),
        [0, 0, 0],
      ),
    );
    for (let i = 1; i + 1 < points.length; i++) {
      this.triangle(points[0], points[i], points[i + 1], color, feature, n);
    }
  }

  /**
   * A cuboid on axes u, v, w (orthonormal, u × v = w): `base` is the centre
   * of its bottom face, `size` its extent along each. `top` and `bottom`
   * choose the caps (a box standing on the ground needs no bottom), and
   * `topColor` the top's colour (a roof). `topScale` shrinks the top face
   * about the axis (a tapered pole).
   */
  cuboid(
    base,
    { u, v, w },
    [lu, lv, lw],
    color,
    feature,
    { top = true, bottom = false, topScale = 1, topColor = color } = {},
  ) {
    const corner = (su, sv, sw) => {
      const k = sw ? topScale : 1;
      return add(
        add(
          add(base, scale(u, (su * k * lu) / 2)),
          scale(v, (sv * k * lv) / 2),
        ),
        scale(w, sw * lw),
      );
    };
    const q = (p0, p1, p2, p3, c = color) =>
      this.quad(
        corner(...p0),
        corner(...p1),
        corner(...p2),
        corner(...p3),
        c,
        feature,
      );
    if (top) {
      q([-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], topColor);
    }
    if (bottom) {
      q([-1, 1, 0], [1, 1, 0], [1, -1, 0], [-1, -1, 0]);
    }
    q([-1, -1, 0], [1, -1, 0], [1, -1, 1], [-1, -1, 1]);
    q([1, 1, 0], [-1, 1, 0], [-1, 1, 1], [1, 1, 1]);
    q([1, -1, 0], [1, 1, 0], [1, 1, 1], [1, -1, 1]);
    q([-1, 1, 0], [-1, -1, 0], [-1, -1, 1], [-1, 1, 1]);
  }

  /**
   * A box standing on the ground: centre `at` ([e, n]) at height `z`,
   * `length` along `angle` (radians from design east), `width` across.
   */
  box(at, z, lengthAlong, width, height, angle, color, feature, options) {
    this.cuboid(
      [at[0], at[1], z],
      frameAt(angle),
      [lengthAlong, width, height],
      color,
      feature,
      options,
    );
  }

  /** A box from point p to point q (its axis), `width` across and `depth` up. */
  beam(p, q, width, depth, color, feature) {
    const axis = sub(q, p);
    const u = normalize(axis);
    let side = cross(u, UP);
    if (length(side) < 1e-6) {
      side = [1, 0, 0];
    }
    const w = normalize(cross(normalize(side), u));
    const v = cross(w, u);
    const base = add(lerp(p, q, 0.5), scale(w, -depth / 2));
    this.cuboid(
      base,
      { u, v, w },
      [length(axis), width, depth],
      color,
      feature,
      {
        bottom: true,
      },
    );
  }

  /**
   * A thin wire from p to q: one ribbon `thickness` wide, turned 45° about
   * the wire so it shows from above and from the side (the material is
   * double-sided).
   */
  wire(p, q, thickness, color, feature) {
    const u = normalize(sub(q, p));
    let side = cross(u, UP);
    side = length(side) < 1e-6 ? [1, 0, 0] : normalize(side);
    const up = normalize(cross(side, u));
    const h = scale(add(side, up), thickness / 2 / Math.SQRT2);
    this.quad(sub(p, h), sub(q, h), add(q, h), add(p, h), color, feature);
  }

  /** A vertical prism of a regular `sides`-gon: centre `at`, from z0 up `height`. */
  cylinder(
    at,
    z0,
    height,
    radius,
    sides,
    color,
    feature,
    { top = true, topColor = color } = {},
  ) {
    const ring = (z) => {
      const points = [];
      for (let k = 0; k < sides; k++) {
        const t = (2 * Math.PI * k) / sides;
        points.push([
          at[0] + radius * Math.cos(t),
          at[1] + radius * Math.sin(t),
          z,
        ]);
      }
      return points;
    };
    const low = ring(z0);
    const high = ring(z0 + height);
    for (let k = 0; k < sides; k++) {
      const k1 = (k + 1) % sides;
      this.quad(low[k], low[k1], high[k1], high[k], color, feature);
    }
    if (top) {
      this.polygon(high, topColor, feature);
    }
  }

  /** A four-sided pyramid: base centre `at` at z0, `half` its base's half-width. */
  pyramid(at, z0, height, half, color, feature) {
    const apex = [at[0], at[1], z0 + height];
    const c = [
      [at[0] - half, at[1] - half, z0],
      [at[0] + half, at[1] - half, z0],
      [at[0] + half, at[1] + half, z0],
      [at[0] - half, at[1] + half, z0],
    ];
    for (let k = 0; k < 4; k++) {
      this.triangle(c[k], c[(k + 1) % 4], apex, color, feature);
    }
  }

  /** A flat rectangle facing up: centre `at` at z, `lengthAlong` along `angle`. */
  flat(at, z, lengthAlong, width, angle, color, feature) {
    const f = frameAt(angle);
    const p = (a, b) =>
      placeIn(f, at, (a * lengthAlong) / 2, (b * width) / 2, z);
    this.quad(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), color, feature);
  }

  /** Whether nothing has been added. */
  get empty() {
    return this.ids.length === 0;
  }

  /** The mesh, as the tile writer takes it. */
  build() {
    return {
      design: Float64Array.from(this.design),
      normals: Float32Array.from(this.normals),
      colors: Float32Array.from(this.colors),
      indices: Uint32Array.from(this.indices),
      featureIds: Uint16Array.from(this.ids),
      features: this.features,
    };
  }
}

/** The longest triangle edge of a mesh, in design units. */
export function longestEdge(mesh) {
  const { design, indices } = mesh;
  let worst = 0;
  const at = (i) => [design[3 * i], design[3 * i + 1], design[3 * i + 2]];
  for (let t = 0; t < indices.length; t += 3) {
    const a = at(indices[t]);
    const b = at(indices[t + 1]);
    const c = at(indices[t + 2]);
    worst = Math.max(
      worst,
      length(sub(b, a)),
      length(sub(c, b)),
      length(sub(a, c)),
    );
  }
  return worst;
}
