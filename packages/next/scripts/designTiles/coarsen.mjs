// The scale ladder's coarse tiles (owner, 2026-11-07: "some mesh decimation
// at the coarse levels is appropriate as long as it doesn't break the SSE
// stuff"): a tile above the leaves draws a simplified version of everything
// in its region, and states an error measured against the full detail it
// replaces.
//
//  - Each part's full detail (its lods[0]) is split by feature. A feature
//    is detail where its full detail lies within FLAT_METRES of one height
//    everywhere (paint, a car park, a rail) or every triangle of it is a
//    sliver under WIRE_METRES wide (a conductor). Detail is drawn as the
//    part's hand-made lod at the level draws it, or dropped where that lod
//    leaves it out and the lod's own error is within the cell (markings,
//    sub-pixel there; that error is then a floor), else kept as it is.
//  - Every other feature is solid. Its input is the hand-made lod's
//    drawing of it where the lod has one (a row of tables as one table, a
//    span's conductors as chords), else its full detail: no lod leaves a
//    solid out. All the tile's solid input is simplified together by vertex
//    clustering on a grid of `cell` (each vertex moved to its cell's mean,
//    collapsed triangles dropped, duplicates merged), so neighbours weld
//    together: a yard's stacks, a building's wings.
//  - A solid piece (one part's one feature) that loses more than half its
//    area has collapsed. Collapsed pieces near each other (within a cell,
//    in one block of MERGE_CELLS cells) merge into one box, oriented to
//    their footprint, where they fill at least MERGE_FILL of it (a street's
//    trees, a lot's trucks); a group that won't is halved until it does,
//    down to a box each. A box is used where it is lighter than what it
//    replaces and within `cell` of its full detail both ways, else the
//    piece is drawn as its input unsimplified. Every solid piece keeps some
//    triangles: no hole where an object was. A box's top is lifted a layer
//    at a time off any differently coloured face it overlaps at its height,
//    so nothing z-fights.
//  - Of a piece that keeps most of its area, an input triangle that
//    collapsed is drawn back where it lay more than `cell` from what is
//    drawn.
//  - The error is measured, both ways (Hausdorff), between what is drawn
//    and the full detail, with the whole ground on both sides (a tile draws
//    its own cells of it; its neighbours, at whatever level, the rest):
//    samples at most `cell` / 4 apart, their largest distance to the other
//    side plus that spacing (distance is 1-Lipschitz, so between samples it
//    rises by at most the spacing). A sample within the error the tile
//    states anyway (twice its children's) stops at the first triangle that
//    close.

// Everything is in design coordinates, before either placement: both
// tilesets draw the same simplified mesh. Plain Node, no dependencies;
// deterministic.
import { MeshBuilder, frameAt } from "./meshBuilder.mjs";

/** A feature within this many metres of one height everywhere is flat. */
export const FLAT_METRES = 0.5;
/** A feature whose every triangle is narrower than this, metres, is a wire. */
export const WIRE_METRES = 0.1;
/** Merged pieces' own footprints fill at least this share of their block's. */
const MERGE_FILL = 0.25;
/** A solid piece keeping less than this share of its area takes a stand-in. */
const KEPT_SHARE = 0.5;
/** Collapsed pieces merge within blocks of this many cells. */
const MERGE_CELLS = 4;

/** The horizontal bounds of triangles, `margin` wider all round: [x0, y0, x1, y1]. */
function bounds(triangles, margin) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { p } of triangles) {
    for (let k = 0; k < 9; k += 3) {
      x0 = Math.min(x0, p[k]);
      x1 = Math.max(x1, p[k]);
      y0 = Math.min(y0, p[k + 1]);
      y1 = Math.max(y1, p[k + 1]);
    }
  }
  return [x0 - margin, y0 - margin, x1 + margin, y1 + margin];
}

/** The mean of a set of triangles' corners, [x, y]. */
function centroid(triangles) {
  let [x, y] = [0, 0];
  for (const { p } of triangles) {
    x += p[0] + p[3] + p[6];
    y += p[1] + p[4] + p[7];
  }
  return [x / (3 * triangles.length), y / (3 * triangles.length)];
}

/**
 * A drawing's triangles: { p: [9 numbers], color, feature } (the feature
 * object it was drawn with, so the tile builder registers the same one).
 */
export function trianglesOf(draw) {
  const b = new MeshBuilder(Infinity);
  draw(b);
  const objects = [...b.featureIndex.keys()];
  const out = [];
  const { design, colors, ids, indices } = b;
  for (let t = 0; t < indices.length; t += 3) {
    const p = new Array(9);
    for (let k = 0; k < 3; k++) {
      const i = indices[t + k];
      p[3 * k] = design[3 * i];
      p[3 * k + 1] = design[3 * i + 1];
      p[3 * k + 2] = design[3 * i + 2];
    }
    const i = indices[t];
    out.push({
      p,
      color: [
        colors[4 * i],
        colors[4 * i + 1],
        colors[4 * i + 2],
        colors[4 * i + 3],
      ],
      feature: objects[ids[i]],
    });
  }
  return out;
}

const area = (p) => {
  const ux = p[3] - p[0];
  const uy = p[4] - p[1];
  const uz = p[5] - p[2];
  const vx = p[6] - p[0];
  const vy = p[7] - p[1];
  const vz = p[8] - p[2];
  return (
    Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2
  );
};

const d2 = (x, y, z, qx, qy, qz) =>
  (x - qx) ** 2 + (y - qy) ** 2 + (z - qz) ** 2;

/** The squared distance from (x, y, z) to triangle p (Ericson's closest point). */
function distance2(x, y, z, p) {
  const ax = p[0];
  const ay = p[1];
  const az = p[2];
  const abx = p[3] - ax;
  const aby = p[4] - ay;
  const abz = p[5] - az;
  const acx = p[6] - ax;
  const acy = p[7] - ay;
  const acz = p[8] - az;
  const apx = x - ax;
  const apy = y - ay;
  const apz = z - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2_ = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2_ <= 0) {
    return d2(x, y, z, ax, ay, az);
  }
  const bpx = x - p[3];
  const bpy = y - p[4];
  const bpz = z - p[5];
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) {
    return d2(x, y, z, p[3], p[4], p[5]);
  }
  const vc = d1 * d4 - d3 * d2_;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return d2(x, y, z, ax + v * abx, ay + v * aby, az + v * abz);
  }
  const cpx = x - p[6];
  const cpy = y - p[7];
  const cpz = z - p[8];
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) {
    return d2(x, y, z, p[6], p[7], p[8]);
  }
  const vb = d5 * d2_ - d1 * d6;
  if (vb <= 0 && d2_ >= 0 && d6 <= 0) {
    const w = d2_ / (d2_ - d6);
    return d2(x, y, z, ax + w * acx, ay + w * acy, az + w * acz);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return d2(
      x,
      y,
      z,
      p[3] + w * (p[6] - p[3]),
      p[4] + w * (p[7] - p[4]),
      p[5] + w * (p[8] - p[5]),
    );
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return d2(
    x,
    y,
    z,
    ax + abx * v + acx * w,
    ay + aby * v + acy * w,
    az + abz * v + acz * w,
  );
}

/**
 * Triangles in a horizontal grid of `cell`, for the distance from a point
 * to the nearest of them. With `clip` ([x0, y0, x1, y1]), only the parts
 * of the grid over it hold triangles: a query near it may miss one farther
 * out, so overstate a distance, never understate it.
 */
export class TriangleGrid {
  constructor(triangles, cell, clip) {
    this.cell = cell;
    this.triangles = triangles;
    this.cells = new Map();
    this.stamp = new Uint32Array(triangles.length);
    this.query = 0;
    // A local origin keeps the cell indices small (and exact as keys).
    this.x0 = clip?.[0] ?? (triangles.length > 0 ? triangles[0].p[0] : 0);
    this.y0 = clip?.[1] ?? (triangles.length > 0 ? triangles[0].p[1] : 0);
    const [ci0, ci1] = clip
      ? [0, Math.floor((clip[2] - this.x0) / cell)]
      : [-Infinity, Infinity];
    const [cj0, cj1] = clip
      ? [0, Math.floor((clip[3] - this.y0) / cell)]
      : [-Infinity, Infinity];
    let [i0, i1, j0, j1] = [Infinity, -Infinity, Infinity, -Infinity];
    triangles.forEach(({ p }, t) => {
      let [a0, a1] = this.span(p[0], p[3], p[6], this.x0);
      let [b0, b1] = this.span(p[1], p[4], p[7], this.y0);
      [a0, a1, b0, b1] = [
        Math.max(a0, ci0),
        Math.min(a1, ci1),
        Math.max(b0, cj0),
        Math.min(b1, cj1),
      ];
      if (a0 > a1 || b0 > b1) {
        return;
      }
      i0 = Math.min(i0, a0);
      i1 = Math.max(i1, a1);
      j0 = Math.min(j0, b0);
      j1 = Math.max(j1, b1);
      for (let i = a0; i <= a1; i++) {
        for (let j = b0; j <= b1; j++) {
          const key = this.key(i, j);
          const list = this.cells.get(key);
          if (list === undefined) {
            this.cells.set(key, [t]);
          } else {
            list.push(t);
          }
        }
      }
    });
    this.bounds = [i0, i1, j0, j1];
  }

  span(a, b, c, origin) {
    return [
      Math.floor((Math.min(a, b, c) - origin) / this.cell),
      Math.floor((Math.max(a, b, c) - origin) / this.cell),
    ];
  }

  key(i, j) {
    return (i + 1_048_576) * 2_097_152 + (j + 1_048_576);
  }

  /**
   * The distance from (x, y, z) to the nearest triangle, exact; or, as soon
   * as one is found within `enough`, some distance at most `enough`.
   * Infinity when there are none.
   */
  distance(x, y, z, enough = 0) {
    const { cell, triangles, stamp } = this;
    const q = ++this.query;
    if (q === 0xffffffff) {
      stamp.fill(0);
      this.query = 1;
    }
    const i = Math.floor((x - this.x0) / cell);
    const j = Math.floor((y - this.y0) / cell);
    const [i0, i1, j0, j1] = this.bounds;
    const reach = Math.max(i - i0, i1 - i, j - j0, j1 - j, 0);
    let best2 = Infinity;
    const enough2 = enough * enough;
    for (let r = 0; r <= reach; r++) {
      // Every cell in ring r is at least (r − 1) cells away horizontally.
      if (r > 0 && ((r - 1) * cell) ** 2 >= best2) {
        break;
      }
      for (let di = -r; di <= r; di++) {
        const edge = di === -r || di === r;
        for (let dj = -r; dj <= r; dj += edge ? 1 : 2 * r) {
          const list = this.cells.get(this.key(i + di, j + dj));
          if (list !== undefined) {
            for (const t of list) {
              if (stamp[t] === this.query) {
                continue;
              }
              stamp[t] = this.query;
              const d2 = distance2(x, y, z, triangles[t].p);
              if (d2 < best2) {
                best2 = d2;
                if (best2 <= enough2) {
                  return Math.sqrt(best2);
                }
              }
            }
          }
          if (r === 0) {
            break;
          }
        }
      }
    }
    return Math.sqrt(best2);
  }
}

/**
 * Calls visit(x, y, z) on points of triangle p no more than `spacing` from
 * every point of it, until visit returns true (and then returns true).
 * From the corner opposite the longest edge, along its two edges e1 and
 * e2, a lattice of steps at most `spacing` / 2: every point of the triangle
 * lies in a lattice cell whose first corner is in the triangle, within
 * |e1|/n1 + |e2|/n2 ≤ `spacing` of it. A long thin triangle (a wire, a
 * kerb) takes few points across.
 */
function sample(p, spacing, visit) {
  const edge = (i, j) =>
    Math.hypot(p[j] - p[i], p[j + 1] - p[i + 1], p[j + 2] - p[i + 2]);
  const ab = edge(0, 3);
  const bc = edge(3, 6);
  const ca = edge(6, 0);
  // The corner opposite the longest edge, and its two edges.
  const o = bc >= ab && bc >= ca ? 0 : ca >= ab ? 3 : 6;
  const q = (o + 3) % 9;
  const r = (o + 6) % 9;
  const step = spacing / 2;
  const n1 = Math.max(1, Math.ceil(edge(o, q) / step));
  const n2 = Math.max(1, Math.ceil(edge(o, r) / step));
  for (let i = 0; i <= n1; i++) {
    const u = i / n1;
    for (let j = 0; u + j / n2 <= 1 + 1e-12; j++) {
      const v = j / n2;
      const w = 1 - u - v;
      if (
        visit(
          w * p[o] + u * p[q] + v * p[r],
          w * p[o + 1] + u * p[q + 1] + v * p[r + 1],
          w * p[o + 2] + u * p[q + 2] + v * p[r + 2],
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * The largest distance from samples of `from` (at most `spacing` apart, so
 * the true largest is at most this plus `spacing`) to the triangles of
 * `grid`; at least `start`, and a sample within `start` ends its search at
 * the first triangle that close.
 */
export function largestDistance(from, grid, spacing, start = 0) {
  let worst = start;
  const visit = (x, y, z) => {
    const d = grid.distance(x, y, z, worst);
    if (d > worst) {
      worst = d;
    }
    return false;
  };
  for (const { p } of from) {
    sample(p, spacing, visit);
  }
  return worst;
}

/** Whether any sample of triangle p lies more than `limit` from `grid`. */
function beyond(p, grid, spacing, limit) {
  return sample(p, spacing, (x, y, z) => grid.distance(x, y, z, limit) > limit);
}

/**
 * Vertex clustering: every vertex of `triangles` moved to the mean of the
 * vertices in its cell of a grid of `cell`. Returns, for each triangle,
 * its moved corners (or null where two corners share a cell: collapsed),
 * and whether it repeats an earlier triangle's three cells.
 */
function cluster(triangles, cell) {
  const sums = new Map();
  const keys = new Array(triangles.length * 3);
  triangles.forEach(({ p }, t) => {
    for (let k = 0; k < 3; k++) {
      const key = `${Math.floor(p[3 * k] / cell)},${Math.floor(p[3 * k + 1] / cell)},${Math.floor(p[3 * k + 2] / cell)}`;
      keys[3 * t + k] = key;
      const s = sums.get(key);
      if (s === undefined) {
        sums.set(key, [p[3 * k], p[3 * k + 1], p[3 * k + 2], 1]);
      } else {
        s[0] += p[3 * k];
        s[1] += p[3 * k + 1];
        s[2] += p[3 * k + 2];
        s[3]++;
      }
    }
  });
  const seen = new Set();
  const out = [];
  for (let t = 0; t < triangles.length; t++) {
    const [ka, kb, kc] = [keys[3 * t], keys[3 * t + 1], keys[3 * t + 2]];
    if (ka === kb || kb === kc || kc === ka) {
      out.push(null);
      continue;
    }
    const p = [];
    for (const key of [ka, kb, kc]) {
      const s = sums.get(key);
      p.push(s[0] / s[3], s[1] / s[3], s[2] / s[3]);
    }
    const scale = Math.max(cell, 1e-9);
    if (area(p) <= 1e-9 * scale * scale) {
      out.push(null);
      continue;
    }
    const id = [ka, kb, kc].sort().join("|");
    const repeat = seen.has(id);
    seen.add(id);
    out.push({ p, repeat });
  }
  return out;
}

/** The up component of triangle p's unit normal. */
const normalZ = (p) => {
  const ux = p[3] - p[0];
  const uy = p[4] - p[1];
  const uz = p[5] - p[2];
  const vx = p[6] - p[0];
  const vy = p[7] - p[1];
  const vz = p[8] - p[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  return nz / (Math.hypot(nx, ny, nz) || 1);
};

/** The convex hull of points [x, y] (counterclockwise). */
function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) {
    return sorted;
  }
  const turn = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (
        out.length >= 2 &&
        turn(out[out.length - 2], out[out.length - 1], p) <= 0
      ) {
        out.pop();
      }
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * A piece's stand-in: its bounding box, turned to its footprint's
 * smallest-area rectangle, from its lowest point to its highest; the top
 * in the colour of its largest up-facing area, the sides in that of its
 * largest other area; a bottom only where the piece faces down somewhere.
 */
function standIn(triangles, feature = triangles[0].feature) {
  const xy = [];
  let [z0, z1] = [Infinity, -Infinity];
  for (const { p } of triangles) {
    for (let k = 0; k < 3; k++) {
      xy.push([p[3 * k], p[3 * k + 1]]);
      z0 = Math.min(z0, p[3 * k + 2]);
      z1 = Math.max(z1, p[3 * k + 2]);
    }
  }
  const h = hull(xy);
  let best = { area: Infinity, angle: 0, box: [0, 0, 0, 0] };
  const edges = h.length >= 2 ? h.length : 1;
  for (let i = 0; i < edges; i++) {
    const a = h[i];
    const b = h[(i + 1) % h.length] ?? a;
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]) || 0;
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    let [u0, u1, v0, v1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const [x, y] of h) {
      const u = c * x + s * y;
      const v = -s * x + c * y;
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    const boxArea = (u1 - u0) * (v1 - v0);
    if (boxArea < best.area) {
      best = { area: boxArea, angle, box: [u0, u1, v0, v1] };
    }
  }
  const [u0, u1, v0, v1] = best.box;
  const [c, s] = [Math.cos(best.angle), Math.sin(best.angle)];
  const mu = (u0 + u1) / 2;
  const mv = (v0 + v1) / 2;
  const centre = [c * mu - s * mv, s * mu + c * mv, z0];
  // Never quite flat: a box's faces need a normal.
  const tiny = 1e-3 * Math.max(u1 - u0, v1 - v0, z1 - z0, 1e-3);
  const size = [
    Math.max(u1 - u0, tiny),
    Math.max(v1 - v0, tiny),
    Math.max(z1 - z0, tiny),
  ];
  let up = { area: -1, color: triangles[0].color };
  let side = { area: -1, color: triangles[0].color };
  let down = false;
  for (const t of triangles) {
    const a = area(t.p);
    const nz = normalZ(t.p);
    if (nz > 0.5) {
      if (a > up.area) {
        up = { area: a, color: t.color };
      }
    } else if (a > side.area) {
      side = { area: a, color: t.color };
    }
    down ||= nz < -0.5;
  }
  if (side.area < 0) {
    side = up;
  }
  const spec = {
    centre,
    angle: best.angle,
    size,
    sideColor: side.color,
    topColor: up.color,
    bottom: down,
    feature,
  };
  const out = boxTriangles(spec);
  out.spec = spec;
  return out;
}

/** A stand-in box's triangles, its top `lift` higher. */
function boxTriangles(spec, lift = 0) {
  const { centre, angle, size, sideColor, topColor, bottom, feature } = spec;
  return trianglesOf((b) =>
    b.cuboid(
      centre,
      frameAt(angle),
      [size[0], size[1], size[2] + lift],
      sideColor,
      feature,
      { top: true, bottom, topColor },
    ),
  );
}

/**
 * Lifts boxes' tops a layer at a time until none lies within half a layer
 * of the height of a differently coloured up-facing face it overlaps (a
 * neighbour's roof, another box's top): no two of them z-fight. Returns
 * each box's triangles.
 */
function liftBoxes(boxes, others, layer, cell) {
  const tops = [];
  const grid = new Map();
  const add = (bounds, z, color) => {
    const top = { bounds, z, color };
    const i = tops.length;
    tops.push(top);
    for (
      let x = Math.floor(bounds[0] / cell);
      x <= Math.floor(bounds[2] / cell);
      x++
    ) {
      for (
        let y = Math.floor(bounds[1] / cell);
        y <= Math.floor(bounds[3] / cell);
        y++
      ) {
        const key = `${x},${y}`;
        const list = grid.get(key);
        if (list === undefined) {
          grid.set(key, [i]);
        } else {
          list.push(i);
        }
      }
    }
  };
  const colorKey = (c) => c.join(",");
  for (const t of others) {
    if (normalZ(t.p) > 0.9999) {
      add(bounds([t], 0), (t.p[2] + t.p[5] + t.p[8]) / 3, colorKey(t.color));
    }
  }
  const clash = (b, z, color) => {
    const seen = new Set();
    for (let x = Math.floor(b[0] / cell); x <= Math.floor(b[2] / cell); x++) {
      for (let y = Math.floor(b[1] / cell); y <= Math.floor(b[3] / cell); y++) {
        for (const i of grid.get(`${x},${y}`) ?? []) {
          if (seen.has(i)) {
            continue;
          }
          seen.add(i);
          const t = tops[i];
          if (
            t.color !== color &&
            Math.abs(t.z - z) < layer / 2 &&
            t.bounds[0] < b[2] &&
            b[0] < t.bounds[2] &&
            t.bounds[1] < b[3] &&
            b[1] < t.bounds[3]
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };
  return boxes.map((box) => {
    const { spec } = box;
    const b = bounds(box, 0);
    const color = colorKey(spec.topColor);
    const z0 = spec.centre[2] + spec.size[2];
    let lift = 0;
    while (clash(b, z0 + lift, color) && lift < 64 * layer) {
      lift += layer;
    }
    add(b, z0 + lift, color);
    return lift === 0 ? box : boxTriangles(spec, lift);
  });
}

/**
 * The feature a block of pieces is picked as: the piece's own, or for
 * several, "<the first> and n more", of their kind where they share one.
 */
function merged(list) {
  const first = list[0].input[0].feature;
  if (list.length === 1) {
    return first;
  }
  const kinds = new Set(list.map((s) => s.input[0].feature.kind));
  return {
    name: `${first.name} and ${list.length - 1} more`,
    kind: kinds.size === 1 ? first.kind : "block",
  };
}

/**
 * A mesh with its repeated vertices shared: those with one position,
 * normal, colour and feature (a face's split pieces, a quad's halves).
 */
export function weld(mesh) {
  const { design, normals, colors, featureIds, indices } = mesh;
  const index = new Map();
  const remap = new Uint32Array(featureIds.length);
  const keep = [];
  for (let i = 0; i < featureIds.length; i++) {
    const key = [
      design[3 * i],
      design[3 * i + 1],
      design[3 * i + 2],
      normals[3 * i],
      normals[3 * i + 1],
      normals[3 * i + 2],
      colors[4 * i],
      colors[4 * i + 1],
      colors[4 * i + 2],
      colors[4 * i + 3],
      featureIds[i],
    ].join(",");
    let j = index.get(key);
    if (j === undefined) {
      j = keep.length;
      keep.push(i);
      index.set(key, j);
    }
    remap[i] = j;
  }
  const pick = (array, width) => {
    const out = new array.constructor(keep.length * width);
    keep.forEach((i, j) => {
      for (let k = 0; k < width; k++) {
        out[width * j + k] = array[width * i + k];
      }
    });
    return out;
  };
  return {
    ...mesh,
    design: pick(design, 3),
    normals: pick(normals, 3),
    colors: pick(colors, 4),
    featureIds: pick(featureIds, 1),
    indices: indices.map((i) => remap[i]),
  };
}

/**
 * The detail features of a model's full-detail triangles (`metersPerUnit`
 * its design unit): flat (within FLAT_METRES of one height) or wires
 * (every triangle narrower than WIRE_METRES: twice its area over its
 * longest edge).
 */
export function detailFeatures(triangles, metersPerUnit) {
  const seen = new Map();
  for (const { p, feature } of triangles) {
    let f = seen.get(feature);
    if (f === undefined) {
      f = { lo: Infinity, hi: -Infinity, wide: 0 };
      seen.set(feature, f);
    }
    f.lo = Math.min(f.lo, p[2], p[5], p[8]);
    f.hi = Math.max(f.hi, p[2], p[5], p[8]);
    const longest = Math.max(
      Math.hypot(p[3] - p[0], p[4] - p[1], p[5] - p[2]),
      Math.hypot(p[6] - p[3], p[7] - p[4], p[8] - p[5]),
      Math.hypot(p[0] - p[6], p[1] - p[7], p[2] - p[8]),
    );
    f.wide = Math.max(f.wide, (2 * area(p)) / Math.max(longest, 1e-12));
  }
  return new Set(
    [...seen]
      .filter(
        ([, f]) =>
          (f.hi - f.lo) * metersPerUnit <= FLAT_METRES ||
          f.wide * metersPerUnit <= WIRE_METRES,
      )
      .map(([feature]) => feature),
  );
}

/**
 * Pieces in groups of neighbours: linked where their footprints' bounding
 * boxes come within `gap` of each other, in first-seen order.
 */
function neighbours(pieces, gap) {
  const boxes = pieces.map((s) => bounds(s.input, gap / 2));
  const parent = [...pieces.keys()];
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      if (a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]) {
        parent[find(j)] = find(i);
      }
    }
  }
  const groups = new Map();
  pieces.forEach((s, i) => {
    const root = find(i);
    const list = groups.get(root);
    if (list === undefined) {
      groups.set(root, [s]);
    } else {
      list.push(s);
    }
  });
  return [...groups.values()];
}

/** The area of a footprint: its triangles' horizontal hull. */
function footprint(triangles) {
  const h = hull(
    triangles.flatMap(({ p }) => [
      [p[0], p[1]],
      [p[3], p[4]],
      [p[6], p[7]],
    ]),
  );
  let a = 0;
  for (let i = 0; i < h.length; i++) {
    const [x0, y0] = h[i];
    const [x1, y1] = h[(i + 1) % h.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a) / 2;
}

/** Groups triangles by their feature object, in first-seen order. */
function byFeature(triangles) {
  const groups = new Map();
  for (const t of triangles) {
    const list = groups.get(t.feature);
    if (list === undefined) {
      groups.set(t.feature, [t]);
    } else {
      list.push(t);
    }
  }
  return groups;
}

/** Whether two sets of triangles are within `limit` of each other, both ways (sampled). */
function within(a, b, spacing, limit) {
  const near = (from, to) => {
    const grid = new TriangleGrid(to, spacing * 4);
    return !from.some(({ p }) => beyond(p, grid, spacing, limit));
  };
  return near(a, b) && near(b, a);
}

/**
 * One coarse tile: what it draws and the error it must state.
 *
 * @param {{
 *   pieces: { part: object, full: object[], lod: { error: number }, hand: object[] | null }[],
 *   ground: object[],
 *   detail: (feature: object) => boolean,
 *   cell: number,
 *   layer: number,
 *   target?: number,
 * }} input
 *   `pieces`: each part held, with its full detail's triangles (`full`),
 *   its lod at the level and that lod's triangles (`hand`; the same array
 *   as `full` where the lod is the full detail, null where it draws
 *   nothing). `ground`: the whole ground at this level as triangles (the
 *   tile draws its own cells of it exactly; its neighbours, at whatever
 *   level, draw the rest), on both sides of the measure. `cell` in design
 *   units; `layer` the ground layer stack's step, design units. `target`:
 *   an error the tile states anyway (twice its
 *   children's): the measure need only show where it is exceeded.
 * @returns {{ triangles: object[], error: number, stats: object }}
 *   `triangles` to draw besides the ground; `error` the measured bound, at
 *   least `target` (or a dropped detail's lod error, where more), design
 *   units.
 */
export function coarsen({ pieces, ground, detail, cell, layer, target = 0 }) {
  const spacing = cell / 4;
  // Drawn exactly as the full detail (no need to measure) or otherwise.
  const exact = [];
  const drawn = [];
  // Full detail drawn otherwise than exactly: sampled for its distance.
  const replaced = [];
  const full = [];
  const solids = [];
  let floor = 0;
  const stats = {
    standIns: 0,
    blocks: 0,
    merged: 0,
    unsimplified: 0,
    restored: 0,
    droppedFlats: 0,
  };
  for (const { full: own, lod, hand } of pieces) {
    full.push(...own);
    const same = hand === own;
    const handBy = byFeature(hand ?? []);
    const fullBy = byFeature(own);
    for (const [feature, tris] of fullBy) {
      const handTris = handBy.get(feature);
      if (detail(feature)) {
        if (same) {
          exact.push(...tris);
        } else if (handTris === undefined) {
          // Dropped where it is sub-pixel at this tile's error (a marking);
          // a larger one (a car park) is kept.
          if (lod.error <= cell) {
            replaced.push(...tris);
            floor = Math.max(floor, lod.error);
            stats.droppedFlats++;
          } else {
            exact.push(...tris);
          }
        } else {
          replaced.push(...tris);
          drawn.push(...handTris);
        }
      } else {
        solids.push({
          full: tris,
          input: handTris ?? tris,
          exact: same || handTris === undefined,
        });
      }
    }
    // What a lod draws that the full detail hasn't (none of the models do).
    for (const [feature, tris] of handBy) {
      if (!fullBy.has(feature)) {
        drawn.push(...tris);
      }
    }
  }

  // Cluster every solid piece's input together.
  const input = solids.flatMap((s) => s.input);
  const moved = cluster(input, cell);
  const restore = [];
  const collapsedPieces = [];
  let at = 0;
  for (const s of solids) {
    let kept = 0;
    let total = 0;
    const survivors = [];
    const collapsed = [];
    for (const t of s.input) {
      const m = moved[at++];
      const a = area(t.p);
      total += a;
      if (m === null) {
        collapsed.push(t);
      } else {
        kept += area(m.p);
        if (!m.repeat) {
          survivors.push({ p: m.p, color: t.color, feature: t.feature });
        }
      }
    }
    if (kept >= KEPT_SHARE * total && survivors.length > 0) {
      drawn.push(...survivors);
      restore.push(...collapsed.map((t) => ({ t, exact: s.exact })));
      replaced.push(...s.full);
      continue;
    }
    collapsedPieces.push(s);
  }

  const boxes = [];
  // A collapsed piece drawn as its input, unsimplified.
  const asInput = (s) => {
    stats.unsimplified++;
    if (s.exact) {
      exact.push(...s.input);
    } else {
      drawn.push(...s.input);
      replaced.push(...s.full);
    }
  };
  // Pieces as one box, where it is lighter and within a cell both ways
  // (and, for several, where they fill enough of it).
  const boxed = (list) => {
    const inputs = list.flatMap((s) => s.input);
    const fulls = list.flatMap((s) => s.full);
    const box = standIn(inputs, merged(list));
    if (
      box.length >= inputs.length ||
      (list.length > 1 &&
        list.reduce((sum, s) => sum + footprint(s.input), 0) <
          MERGE_FILL * footprint(box)) ||
      !within(box, fulls, spacing, cell - spacing)
    ) {
      return false;
    }
    boxes.push(box);
    replaced.push(...fulls);
    return true;
  };
  // Collapsed neighbours (a street's trees, a lot's trucks, a run of poles)
  // merge into one block; the rest take a box each, or stay as they are.
  const buckets = new Map();
  const block = cell * MERGE_CELLS;
  for (const s of collapsedPieces) {
    const [x, y] = centroid(s.input);
    const key = `${Math.floor(x / block)},${Math.floor(y / block)}`;
    const list = buckets.get(key);
    if (list === undefined) {
      buckets.set(key, [s]);
    } else {
      list.push(s);
    }
  }
  // A group as one block, else each half (split across its longer spread).
  const merge = (list) => {
    if (list.length === 1) {
      if (boxed(list)) {
        stats.standIns++;
      } else {
        asInput(list[0]);
      }
      return;
    }
    if (boxed(list)) {
      stats.blocks++;
      stats.merged += list.length;
      return;
    }
    const at = list.map((s) => centroid(s.input));
    const spread = (k) =>
      Math.max(...at.map((c) => c[k])) - Math.min(...at.map((c) => c[k]));
    const k = spread(0) >= spread(1) ? 0 : 1;
    const order = list
      .map((s, i) => ({ s, key: at[i][k] }))
      .sort((a, b) => a.key - b.key)
      .map(({ s }) => s);
    const half = Math.ceil(order.length / 2);
    merge(order.slice(0, half));
    merge(order.slice(half));
  };
  for (const bucket of buckets.values()) {
    for (const list of neighbours(bucket, cell)) {
      merge(list);
    }
  }
  for (const box of liftBoxes(boxes, [...exact, ...drawn], layer, cell)) {
    drawn.push(...box);
  }

  // Collapsed triangles that lay more than a cell from what is drawn come back.
  const clip = bounds([...full, ...drawn], 2 * cell);
  if (restore.length > 0) {
    const grid = new TriangleGrid([...exact, ...drawn, ...ground], cell, clip);
    for (const { t, exact: same } of restore) {
      if (beyond(t.p, grid, spacing, cell)) {
        (same ? exact : drawn).push(t);
        stats.restored++;
      }
    }
  }

  // The measured error, both ways, against the full detail and the ground.
  let error = 0;
  if (replaced.length > 0 || drawn.length > 0) {
    const shown = new TriangleGrid([...exact, ...drawn, ...ground], cell, clip);
    const detail = new TriangleGrid([...full, ...ground], cell, clip);
    // Measured only as far as it exceeds the target: a sample within it
    // ends its search at the first triangle that close.
    const start = Math.max(target - spacing, 0);
    const there = largestDistance(replaced, shown, spacing, start);
    const back = largestDistance(drawn, detail, spacing, start);
    error = Math.max(there, back) + spacing;
    stats.there = there;
    stats.back = back;
  }
  return {
    triangles: [...exact, ...drawn],
    error: Math.max(error, floor),
    stats,
  };
}
