// The scale ladder's tile trees (plan 4b Task 17b): each portfolio model as
// parts with levels of detail and ground surfaces, cut into a tree of tiles
// over its design footprint, with geometric errors by Task 14's rules.
//
//  - A part is one thing (a building, a span of the pole line, a row of
//    panels) at a point `at` ([e, n], design units), with `lods`: lods[l] is
//    how it is drawn at tree level l (0 = the leaves), the last one standing
//    for every coarser level. Each states `error`, a bound on the distance
//    from the full-detail part to what is drawn instead (0 at full detail),
//    and `draw(builder)`, or `draw: null` where the part is dropped.
//  - A ground is a flat rectangle (a runway, a site plan, the water), cut
//    into cells at each level small enough for the sag rule there, each
//    cell in the tile holding its centre. `lods` as a part's, without draw:
//    `{ error, keep }`.
//  - The tree splits the footprint's box in two along every axis longer
//    than `leafSize`, until none is, so every leaf is at one depth. A tile
//    holds the parts whose `at` it holds; empty tiles are left out.
//  - A leaf's geometric error is the leaf tolerance (1 mm). A parent's is
//    the larger of twice its children's and the largest error of what it
//    draws instead of full detail. Every face at level l is subdivided until
//    its edges' sag (d²/8R) is at most 2^l times the leaf tolerance, which
//    the doubling keeps within the tile's error (each tile's mesh() checks).
import { airportPlan } from "./airportMesh.mjs";
import { blockPlan } from "./blockMesh.mjs";
import { campusPlan } from "./campusMesh.mjs";
import {
  MeshBuilder,
  edgeSag,
  longestEdge,
  longestEdgeFor,
} from "./meshBuilder.mjs";
import { poleLinePlan } from "./poleLineMesh.mjs";
import { portPlan } from "./portMesh.mjs";
import { buildingPlan } from "./siteMesh.mjs";
import { solarFarmPlan } from "./solarFarmMesh.mjs";

/** A leaf's geometric error, metres: the sag rule's tolerance at the leaves. */
export const LEAF_ERROR_METRES = 0.001;

const PLANS = {
  building: buildingPlan,
  block: blockPlan,
  port: portPlan,
  solarFarm: solarFarmPlan,
  airport: airportPlan,
  campus: campusPlan,
  poleLine: poleLinePlan,
};

/**
 * A portfolio site's model as parts, grounds, its leaf size, its anchor and
 * its landmark (a named design point for the answers).
 *
 * @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site
 */
export function ladderPlan(site) {
  const plan = PLANS[site.model.kind];
  if (plan === undefined) {
    throw new Error(
      `ladderPlan: ${site.id}: no model of kind ${site.model.kind}`,
    );
  }
  return plan(site);
}

/** The lod a part (or ground) uses at a level: the last for every coarser one. */
const lodAt = (item, level) => item.lods[Math.min(level, item.lods.length - 1)];

/** A ground rectangle's corners ([e, n]). */
function groundCorners({ at, length, width, angle }) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => [
    at[0] + (c * a * length) / 2 - (s * b * width) / 2,
    at[1] + (s * a * length) / 2 + (c * b * width) / 2,
  ]);
}

/** A ground's cells no longer than `cell` on a side: { at, length, width }. */
function groundCells(ground, cell) {
  const { at, length, width, angle } = ground;
  const nu = Math.max(1, Math.ceil(length / cell));
  const nv = Math.max(1, Math.ceil(width / cell));
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const cells = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = -length / 2 + (length * (i + 0.5)) / nu;
      const b = -width / 2 + (width * (j + 0.5)) / nv;
      cells.push({
        at: [at[0] + c * a - s * b, at[1] + s * a + c * b],
        length: length / nu,
        width: width / nv,
      });
    }
  }
  return cells;
}

/**
 * The tile tree of a plan: the top node, as `writeTilesets` takes it (`id`,
 * `mesh()`, `geometricError`, `children`), with `level`, and the tree's
 * `levels` and `tiles` counts.
 *
 * @param {ReturnType<typeof ladderPlan>} plan
 * @param {{ leafError: number, metersPerUnit: number }} options
 *   `leafError` in design units.
 */
export function ladderTree(plan, { leafError, metersPerUnit }) {
  const { parts, grounds = [], leafSize } = plan;
  const mpu = metersPerUnit;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const extend = ([e, n]) => {
    x0 = Math.min(x0, e);
    y0 = Math.min(y0, n);
    x1 = Math.max(x1, e);
    y1 = Math.max(y1, n);
  };
  parts.forEach((p) => extend(p.at));
  grounds.forEach((g) => groundCorners(g).forEach(extend));
  const width = Math.max(x1 - x0, 1e-9);
  const height = Math.max(y1 - y0, 1e-9);
  const splits = (size) =>
    size > leafSize ? Math.ceil(Math.log2(size / leafSize)) : 0;
  const nx = splits(width);
  const ny = splits(height);
  const depth = Math.max(nx, ny);
  // The cell counts along each axis at a level (0 = leaves).
  const grid = (level) => [
    2 ** Math.min(depth - level, nx),
    2 ** Math.min(depth - level, ny),
  ];
  const cellOf = (level, [e, n]) => {
    const [gx, gy] = grid(level);
    const ix = Math.min(
      gx - 1,
      Math.max(0, Math.floor(((e - x0) / width) * gx)),
    );
    const iy = Math.min(
      gy - 1,
      Math.max(0, Math.floor(((n - y0) / height) * gy)),
    );
    return `${ix}-${iy}`;
  };
  // The longest edge at a level, design units: its sag is 2^level leaf errors.
  const maxEdge = (level) =>
    (longestEdgeFor(leafError * mpu * 2 ** level) / mpu) * (1 - 1e-9);

  // Each level's buckets: the parts and ground cells each tile holds.
  const buckets = [];
  for (let level = 0; level <= depth; level++) {
    const bucket = new Map();
    const into = (key) => {
      let b = bucket.get(key);
      if (b === undefined) {
        b = { parts: [], cells: [], dropped: 0 };
        bucket.set(key, b);
      }
      return b;
    };
    parts.forEach((p) => into(cellOf(level, p.at)).parts.push(p));
    const cell = maxEdge(level) / 1.5;
    for (const g of grounds) {
      const lod = lodAt(g, level);
      for (const c of groundCells(g, cell)) {
        const b = into(cellOf(level, c.at));
        if (lod.keep) {
          b.cells.push({ ...c, ground: g });
        } else {
          // Dropped here: its error counts where its cells would have been.
          b.dropped = Math.max(b.dropped, lod.error);
        }
      }
    }
    buckets.push(bucket);
  }

  let tiles = 0;
  const node = (level, ix, iy) => {
    const children = [];
    if (level > 0) {
      const [gx, gy] = grid(level);
      const [cx, cy] = grid(level - 1);
      const fx = cx / gx;
      const fy = cy / gy;
      for (let j = 0; j < fy; j++) {
        for (let i = 0; i < fx; i++) {
          const child = node(level - 1, ix * fx + i, iy * fy + j);
          if (child !== undefined) {
            children.push(child);
          }
        }
      }
    }
    const held = buckets[level].get(`${ix}-${iy}`) ?? {
      parts: [],
      cells: [],
      dropped: 0,
    };
    if (
      children.length === 0 &&
      held.parts.length === 0 &&
      held.cells.length === 0
    ) {
      return undefined;
    }
    // Twice the children's, or what this level draws instead of full
    // detail where that is more; at least 2^level leaf errors, the sag its
    // faces are cut to (a parent without children has only that).
    let error = leafError * 2 ** level;
    for (const c of children) {
      error = Math.max(error, 2 * c.geometricError);
    }
    for (const p of held.parts) {
      error = Math.max(error, lodAt(p, level).error);
    }
    for (const c of held.cells) {
      error = Math.max(error, lodAt(c.ground, level).error);
    }
    error = Math.max(error, held.dropped);
    tiles++;
    const id = `${level}-${ix}-${iy}`;
    const geometricError = error;
    return {
      id,
      level,
      geometricError,
      children,
      mesh() {
        const builder = new MeshBuilder(maxEdge(level));
        for (const p of held.parts) {
          lodAt(p, level).draw?.(builder);
        }
        for (const c of held.cells) {
          const g = c.ground;
          builder.flat(
            c.at,
            g.z,
            c.length,
            c.width,
            g.angle,
            g.color,
            g.feature,
          );
        }
        if (builder.empty) {
          return null;
        }
        const mesh = builder.build();
        // The sag rule, checked: the longest edge's sag within the error.
        const sag = edgeSag(longestEdge(mesh) * mpu) / mpu;
        if (!(sag <= geometricError * (1 + 1e-9))) {
          throw new Error(
            `ladderTree: tile ${id}: an edge sags ${(sag * mpu).toPrecision(3)} m, over its geometric error`,
          );
        }
        return mesh;
      },
    };
  };
  const top = node(depth, 0, 0);
  if (top === undefined) {
    throw new Error("ladderTree: the plan is empty");
  }
  return { top, levels: depth + 1, tiles };
}

/**
 * The full-detail model's extent: the largest horizontal distance between
 * two of its vertices (design units), and its vertex farthest horizontally
 * from `anchor` (the lowest, of several) and that distance.
 */
export function planExtent(plan, anchor) {
  const builder = new MeshBuilder(Infinity);
  for (const p of plan.parts) {
    p.lods[0].draw?.(builder);
  }
  for (const g of plan.grounds ?? []) {
    if (g.lods[0].keep) {
      builder.flat(g.at, g.z, g.length, g.width, g.angle, g.color, g.feature);
    }
  }
  const design = builder.design;
  let farthest = [anchor[0], anchor[1], anchor[2]];
  let reach = 0;
  const points = [];
  for (let i = 0; i < design.length; i += 3) {
    const e = design[i];
    const n = design[i + 1];
    points.push([e, n]);
    const d = Math.hypot(e - anchor[0], n - anchor[1]);
    // The lowest of the farthest vertices (a footprint's corner on the
    // ground rather than its roof above it).
    if (d > reach || (d === reach && design[i + 2] < farthest[2])) {
      reach = d;
      farthest = [e, n, design[i + 2]];
    }
  }
  return { extent: diameter(points), farthest, reach };
}

/** The largest distance between two points ([e, n]): over their convex hull. */
function diameter(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
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
  const hull = [...half(sorted), ...half([...sorted].reverse())];
  let best = 0;
  for (let i = 0; i < hull.length; i++) {
    for (let j = i + 1; j < hull.length; j++) {
      best = Math.max(
        best,
        Math.hypot(hull[i][0] - hull[j][0], hull[i][1] - hull[j][1]),
      );
    }
  }
  return best;
}
