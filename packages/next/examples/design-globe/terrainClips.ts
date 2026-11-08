// Terrain clipped under the designs (owner's feedback F11, with Cesium
// World Terrain): each site's footprint, and the corridor out to its side
// slopes' daylight lines, so the ground never pokes through a design
// surface and meets the corridor's slopes. The regions are
// polygons in geodetic degrees (the globe's `addTerrainClip`), from the
// design's own outline carried through the site's reprojected placement
// (where the design truly is), padded by rigid's error there so the rigid
// placement, drawn up to that far away, is clear of the ground too (all
// but the corridor's: main.ts says why).
// Pure but for `syncTerrainClips`, so test/designGlobeTerrainClips.test.ts
// runs it in Node.
import type { Alignment } from "../../src/engineering/alignment.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";

/** A polygon vertex, degrees (the globe's `TerrainClipPosition`). */
export interface ClipVertex {
  readonly longitude: number;
  readonly latitude: number;
}

/** Design point to body-fixed metres, as a placement draws it. */
export type Displayed = (design: ArrayLike<number>) => ArrayLike<number>;

const DEG = 180 / Math.PI;

/** A body-fixed point's longitude and latitude, degrees. */
export function geodeticOf(p: ArrayLike<number>): ClipVertex {
  const c = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), {
    longitude: 0,
    latitude: 0,
    height: 0,
  });
  if (c === undefined) {
    throw new Error("terrain clip: a point at the Earth's centre");
  }
  return { longitude: c.longitude * DEG, latitude: c.latitude * DEG };
}

/**
 * A site's footprint (its design corners, counterclockwise, at its
 * ground) as a polygon on the globe, each corner pushed `pad` design units
 * further out from the footprint's middle.
 */
export function footprintRegion(
  corners: readonly (readonly [number, number, number])[],
  displayed: Displayed,
  pad: number,
): ClipVertex[] {
  const n = corners.length;
  const cx = corners.reduce((s, c) => s + c[0], 0) / n;
  const cy = corners.reduce((s, c) => s + c[1], 0) / n;
  return corners.map(([e, north, h]) => {
    const dx = e - cx;
    const dy = north - cy;
    const l = Math.hypot(dx, dy) || 1;
    return geodeticOf(
      displayed([e + (dx / l) * pad, north + (dy / l) * pad, h]),
    );
  });
}

/** What a site's own clip needs (page.ts `SiteEntry`'s fields). */
export interface SiteClipShape {
  /** The model's footprint corners at its ground, design units. */
  readonly corners?: readonly (readonly [number, number, number])[];
  /** A model along a line: its route and its foundations' reach either side. */
  readonly route?: {
    readonly points: readonly (readonly [number, number, number])[];
    readonly halfWidth: number;
  };
  /** The model stands on the real ground. */
  readonly onGround?: boolean;
}

/**
 * The terrain clip for a site other than the corridor, or undefined for
 * none: nothing under a model that stands on the real ground (London's
 * poles, the site-grid building on its plinth: UX review M1, M5); around a
 * line model's route (a vertex every 500 design units); else over its
 * footprint. Each is padded by rigid's error there (`rigidAcross` across
 * the ground and `rigidError` in all, metres) and `margin` metres, so the
 * ground never pokes through a flat design surface in either placement.
 */
export function siteClipRegion(
  site: SiteClipShape,
  displayed: Displayed,
  metersPerUnit: number,
  rigid: {
    readonly error: (design: ArrayLike<number>) => number;
    readonly across: (design: ArrayLike<number>) => number;
  },
  margin: number,
): ClipVertex[] | undefined {
  if (site.onGround === true) {
    return undefined;
  }
  const { route, corners } = site;
  if (route !== undefined) {
    return routeRegion(
      route.points,
      displayed,
      (d) => route.halfWidth + (rigid.across(d) + margin) / metersPerUnit,
      500,
    );
  }
  return corners === undefined
    ? undefined
    : footprintRegion(
        corners,
        displayed,
        (Math.max(...corners.map(rigid.error)) + margin) / metersPerUnit,
      );
}

/**
 * A buffered line: the route's left side from its start to its end, then
 * its right side back, each point `pad(point)` design units out from the
 * route (mitred at its corners) and the ends squared off that far past the
 * end points, a vertex every `step` design units along each leg. For a
 * model laid along a line (London's pole line), whose footprint's
 * rectangle would clip far more ground than it stands on.
 */
export function routeRegion(
  route: readonly (readonly [number, number, number])[],
  displayed: Displayed,
  pad: (design: readonly [number, number, number]) => number,
  step: number,
): ClipVertex[] {
  if (route.length < 2) {
    throw new RangeError("routeRegion: a route needs two points");
  }
  const left: [number, number, number][] = [];
  const right: [number, number, number][] = [];
  const legs = route.length - 1;
  const along = (k: number): [number, number] => {
    const [a, b] = [route[k]!, route[k + 1]!];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  for (let k = 0; k < legs; k++) {
    const [a, b] = [route[k]!, route[k + 1]!];
    const u = along(k);
    const pieces = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step),
    );
    // A corner is its leg-in's last point; the first leg also has its start.
    for (let i = k === 0 ? 0 : 1; i <= pieces; i++) {
      const t = i / pieces;
      const p: [number, number, number] = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];
      const r = pad(p);
      // Left of the direction of travel, mitred at a corner.
      let normal: [number, number] = [-u[1], u[0]];
      let reach = r;
      let [e, n] = [p[0], p[1]];
      if (i === pieces && k < legs - 1) {
        const w = along(k + 1);
        const bisector = [-u[1] - w[1], u[0] + w[0]];
        const l = Math.hypot(bisector[0]!, bisector[1]!);
        normal = [bisector[0]! / l, bisector[1]! / l];
        reach = r / (normal[0] * -u[1] + normal[1] * u[0]);
      }
      if (k === 0 && i === 0) {
        [e, n] = [e - u[0] * r, n - u[1] * r];
      }
      if (k === legs - 1 && i === pieces) {
        [e, n] = [e + u[0] * r, n + u[1] * r];
      }
      left.push([e + normal[0] * reach, n + normal[1] * reach, p[2]]);
      right.push([e - normal[0] * reach, n - normal[1] * reach, p[2]]);
    }
  }
  return [...left, ...right.reverse()].map((d) => geodeticOf(displayed(d)));
}

/**
 * How far apart two body-fixed points are across the ground: their
 * separation less its part along the ellipsoid's normal at `b` (metres).
 * The part of rigid's error a terrain clip must reach past; the rest is up
 * or down.
 */
export function horizontalApart(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number {
  const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
    Float64Array.from(b),
    new Float64Array(3),
  );
  const d = [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
  if (up === undefined) {
    return Math.hypot(d[0]!, d[1]!, d[2]!);
  }
  const v = d[0]! * up[0]! + d[1]! * up[1]! + d[2]! * up[2]!;
  return Math.hypot(d[0]! - v * up[0]!, d[1]! - v * up[1]!, d[2]! - v * up[2]!);
}

/**
 * How far either side of the centreline the corridor's clip reaches over a
 * structure, design units: a sliver (about 3 mm across in US survey feet),
 * so that one simple polygon clips the earthwork either side and, in
 * effect, none of the ground under a viaduct or over a tunnel. (A region is
 * one simple polygon, and a world has 32: one region per stretch of
 * earthwork wouldn't fit.)
 */
export const STRIP_SLIVER = 0.005;

/**
 * An earthwork stretch's daylight lines: each side's, as [station, distance
 * out from the centreline] in design units, in order of station from the
 * stretch's start to its end, exact (linear in station between points).
 */
export interface DaylightStretch {
  readonly fromStation: number;
  readonly toStation: number;
  readonly left: readonly (readonly [number, number])[];
  readonly right: readonly (readonly [number, number])[];
}

/**
 * How the corridor's clip may be laid out, first choice first: in so many
 * pieces (each a region, cut in the middle of a structure, where the clip
 * is a sliver anyway), each within so many vertices. One region can't take
 * the exact daylight lines (about 2,900 vertices); a few can, and a world
 * has 32. The page takes the first plan the globe accepts: it refuses a
 * region whose grid crowds more than 32 edges into a cell, or where a
 * fragment would test more than 128 over the regions it lies in.
 */
export const CORRIDOR_CLIP_PLANS: readonly {
  readonly pieces: number;
  readonly vertices: number;
}[] = [
  { pieces: 4, vertices: 1024 },
  { pieces: 5, vertices: 1024 },
  { pieces: 6, vertices: 1024 },
  { pieces: 8, vertices: 1024 },
  { pieces: 8, vertices: 640 },
  { pieces: 8, vertices: 384 },
];

/** One region of the corridor's clip along its daylight lines (`daylightRegion`). */
export interface DaylightRegion {
  readonly polygon: ClipVertex[];
  /** The station range it covers (its ends in structures, or the alignment's). */
  readonly fromStation: number;
  readonly toStation: number;
  /**
   * How far outside the daylight lines its edges may stand, at most,
   * design units: the simplification's tolerance and the curves' chords.
   * Never inside them.
   */
  readonly outward: number;
  /** The simplification's tolerance (0: none), design units. */
  readonly tolerance: number;
  /** Vertices the exact daylight lines and slivers would have taken. */
  readonly exactVertices: number;
}

/**
 * An upper envelope of `points` ([station, distance out], in order): a
 * subset of their stations, each distance raised as needed so that the
 * polyline through them is nowhere inside the points' own (linear between
 * them), and an edge's largest excess at a point, with `sag` (what the
 * edge will be moved out for its curve), within `tolerance`. Greedy: each
 * vertex reaches as far on as the tolerance allows (one point on, at
 * least). Each edge's excess is returned with it.
 */
function envelope(
  points: readonly (readonly [number, number])[],
  tolerance: number,
  sag: (a: number, b: number, ua: number, ub: number) => number,
): { vertices: [number, number][]; excess: number[] } {
  const n = points.length;
  const vertices: [number, number][] = [[points[0]![0], points[0]![1]]];
  const excess: number[] = [];
  let i = 0;
  let vi = points[0]![1];
  while (i < n - 1) {
    let best = i + 1;
    let vBest = points[i + 1]![1];
    let eBest = 0;
    const si = points[i]![0];
    for (let j = i + 2; j < n; j++) {
      const [sj, uj] = points[j]!;
      // The least end height whose line from (si, vi) clears every point between.
      let vj = uj;
      for (let k = i + 1; k < j; k++) {
        const t = (points[k]![0] - si) / (sj - si);
        vj = Math.max(vj, vi + (points[k]![1] - vi) / t);
      }
      let e = vj - uj;
      for (let k = i + 1; k < j; k++) {
        const t = (points[k]![0] - si) / (sj - si);
        e = Math.max(e, vi + (vj - vi) * t - points[k]![1]);
      }
      if (e + sag(si, sj, vi, vj) > tolerance) {
        break;
      }
      best = j;
      vBest = vj;
      eBest = e;
    }
    vertices.push([points[best]![0], vBest]);
    excess.push(eBest);
    i = best;
    vi = vBest;
  }
  return { vertices, excess };
}

/** The alignment's largest curvature over [a, b], 1/design units. */
function curvatureOver(alignment: Alignment, a: number, b: number): number {
  let k = 0;
  for (const e of alignment.horizontalElements) {
    if (e.station < b && e.station + e.length > a) {
      k = Math.max(k, Math.abs(e.startCurvature), Math.abs(e.endCurvature));
    }
  }
  return k;
}

/** Checks that each stretch's daylight lines run from its start to its end. */
function checkStretches(stretches: readonly DaylightStretch[]): void {
  for (const st of stretches) {
    for (const line of [st.left, st.right]) {
      if (
        line.length < 2 ||
        line[0]![0] !== st.fromStation ||
        line[line.length - 1]![0] !== st.toStation
      ) {
        throw new RangeError(
          `daylightRegion: the stretch ${st.fromStation} to ${st.toStation} needs each daylight line from its start to its end`,
        );
      }
    }
  }
}

/**
 * The spans of [from, to] between `stretches` (structures, or a cut
 * through one), each with its sliver's stations: its ends, and every
 * `curveStep` design units on a curve.
 */
function spansOf(
  alignment: Alignment,
  stretches: readonly DaylightStretch[],
  from: number,
  to: number,
  curveStep: number,
): number[][] {
  const spans: [number, number][] = [];
  let at = from;
  for (const st of stretches) {
    if (st.toStation <= from || st.fromStation >= to) {
      continue;
    }
    if (st.fromStation > at) {
      spans.push([at, st.fromStation]);
    }
    at = st.toStation;
  }
  if (to > at) {
    spans.push([at, to]);
  }
  return spans.map(([a, b]) => {
    const out = [a];
    for (let s = a + curveStep; s < b; s += curveStep) {
      if (curvatureOver(alignment, s - curveStep, s + curveStep) > 0) {
        out.push(s);
      }
    }
    out.push(b);
    return out;
  });
}

/**
 * Where to cut the corridor's clip into `pieces` regions of about equal
 * exact vertices: in the middle of a structure, never on earthwork.
 * Returns the pieces' station ranges, start to end.
 */
export function daylightPieces(
  alignment: Alignment,
  stretches: readonly DaylightStretch[],
  pieces: number,
  curveStep = 500,
): { fromStation: number; toStation: number }[] {
  checkStretches(stretches);
  const start = alignment.startStation;
  const end = alignment.endStation;
  const spans = spansOf(alignment, stretches, start, end, curveStep);
  // Each place a cut could go (a span's middle), with the exact vertices
  // before it.
  const cuts: { station: number; before: number }[] = [];
  let before = 0;
  const all = [
    ...spans.map((stations) => ({ from: stations[0]!, stations })),
    ...stretches.map((stretch) => ({ from: stretch.fromStation, stretch })),
  ].sort((p, q) => p.from - q.from);
  for (const piece of all) {
    if ("stations" in piece) {
      const [a, b] = [piece.stations[0]!, piece.stations.at(-1)!];
      if (a > start && b < end) {
        cuts.push({
          station: (a + b) / 2,
          before: before + piece.stations.length,
        });
      }
      before += 2 * piece.stations.length;
    } else {
      before += piece.stretch.left.length + piece.stretch.right.length;
    }
  }
  const out: { fromStation: number; toStation: number }[] = [];
  let from = start;
  for (let j = 1; j < pieces; j++) {
    const target = (before * j) / pieces;
    let best: (typeof cuts)[number] | undefined;
    for (const c of cuts) {
      if (
        c.station > from &&
        (best === undefined ||
          Math.abs(c.before - target) < Math.abs(best.before - target))
      ) {
        best = c;
      }
    }
    if (best === undefined) {
      break;
    }
    out.push({ fromStation: from, toStation: best.station });
    from = best.station;
  }
  out.push({ fromStation: from, toStation: end });
  return out;
}

/**
 * One region of the corridor's clip along its daylight lines (the side
 * slopes' outer edges), over [from, to] (the alignment's ends, or cuts in
 * the middle of structures, `daylightPieces`): the left daylight line from
 * `from` to `to`, then the right one back. Over the structures it narrows
 * to STRIP_SLIVER, with a vertex at each end and every `curveStep` design
 * units on a curve, so the ground stays under a viaduct and over a tunnel.
 * Within `maxVertices` the daylight lines are exact; past it they are
 * simplified (`envelope`) at the least tolerance, found by bisection to a
 * hundredth of a design unit, that fits. Each edge is moved out by its
 * chord's sagitta on a curve (edges are straight on the globe, the
 * daylight line curves with the alignment), so no edge is inside the
 * slopes' outer edge.
 */
export function daylightRegion(
  alignment: Alignment,
  displayed: Displayed,
  stretches: readonly DaylightStretch[],
  maxVertices: number,
  range: { fromStation: number; toStation: number } = {
    fromStation: alignment.startStation,
    toStation: alignment.endStation,
  },
  curveStep = 500,
): DaylightRegion {
  checkStretches(stretches);
  const { fromStation: from, toStation: to } = range;
  const mine = stretches.filter(
    (st) => st.fromStation >= from && st.toStation <= to,
  );
  if (
    stretches.some(
      (st) => st.toStation > from && st.fromStation < to && !mine.includes(st),
    )
  ) {
    throw new RangeError(
      `daylightRegion: ${from} to ${to} cuts through earthwork; cut in a structure`,
    );
  }
  const spans = spansOf(alignment, mine, from, to, curveStep);
  const sliverCount = spans.reduce((n, s) => n + s.length, 0);
  // The spans and the stretches, in order of station.
  const pieces = [
    ...spans.map((stations) => ({ from: stations[0]!, stations })),
    ...mine.map((stretch) => ({ from: stretch.fromStation, stretch })),
  ].sort((p, q) => p.from - q.from);
  /**
   * How far a straight edge from (a, ua) to (b, ub) falls inside the line
   * of station and offset it chords, on the alignment's curve: the
   * offset's own sagitta, κ(1 + κu) Δs²/8, and the slide along the road
   * that turning the offset's slope g gives, 2g²κ Δs²/8 across it.
   */
  const sag = (a: number, b: number, ua: number, ub: number) => {
    const k = curvatureOver(alignment, a, b);
    const g = (ub - ua) / (b - a);
    return ((b - a) ** 2 * k * (1 + k * Math.max(ua, ub) + 2 * g * g)) / 8;
  };

  /**
   * One side's [station, distance out] from `from` to `to` at `tolerance`,
   * and the most any of its edges stands outside the daylight line.
   */
  const side = (key: "left" | "right", tolerance: number) => {
    const points: [number, number][] = [];
    let outward = 0;
    for (const piece of pieces) {
      if ("stations" in piece) {
        for (const s of piece.stations) {
          points.push([s, STRIP_SLIVER]);
        }
        continue;
      }
      const { vertices, excess } = envelope(piece.stretch[key], tolerance, sag);
      // Each edge out by its sagitta on a curve, at both its ends.
      const lift = vertices.map(() => 0);
      for (let i = 1; i < vertices.length; i++) {
        const [a, ua] = vertices[i - 1]!;
        const [b, ub] = vertices[i]!;
        const m = sag(a, b, ua, ub);
        lift[i - 1] = Math.max(lift[i - 1]!, m);
        lift[i] = Math.max(lift[i]!, m);
      }
      for (let i = 1; i < vertices.length; i++) {
        outward = Math.max(
          outward,
          excess[i - 1]! + Math.max(lift[i - 1]!, lift[i]!),
        );
      }
      vertices.forEach(([s, u], i) => points.push([s, u + lift[i]!]));
    }
    return { points, outward };
  };
  const exactVertices =
    2 * sliverCount +
    mine.reduce((n, st) => n + st.left.length + st.right.length, 0);
  const count = (tolerance: number) =>
    side("left", tolerance).points.length +
    side("right", tolerance).points.length;
  let tolerance = 0;
  if (count(0) > maxVertices) {
    let lo = 0;
    let hi = 1;
    while (count(hi) > maxVertices) {
      lo = hi;
      hi *= 2;
      if (hi > 1e5) {
        throw new RangeError(
          `daylightRegion: ${from} to ${to} won't come within ${maxVertices} vertices`,
        );
      }
    }
    while (hi - lo > 0.01) {
      const mid = (lo + hi) / 2;
      if (count(mid) > maxVertices) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    tolerance = hi;
  }
  const left = side("left", tolerance);
  const right = side("right", tolerance);
  const edge = (sign: -1 | 1, points: readonly [number, number][]) =>
    points.map(([s, u]) =>
      geodeticOf(displayed(alignment.pointAt(s, sign * u))),
    );
  return {
    polygon: [
      ...edge(-1, left.points),
      ...edge(1, [...right.points].reverse()),
    ],
    fromStation: from,
    toStation: to,
    outward: Math.max(left.outward, right.outward),
    tolerance,
    exactVertices,
  };
}

/** The regions clipped now, by site, so a site placed again replaces its own. */
const added = new WeakMap<Tileset3D, Map<string, unknown>>();

/**
 * Clips `globe`'s terrain inside `polygon`, for `site` (replacing what
 * was clipped for it before). Returns why it couldn't, if it couldn't
 * (the globe refuses some regions, saying why); nothing is clipped then.
 */
export function syncTerrainClip(
  globe: Tileset3D,
  site: string,
  polygon: readonly ClipVertex[] | undefined,
): string | undefined {
  let mine = added.get(globe);
  if (mine === undefined) {
    mine = new Map();
    added.set(globe, mine);
  }
  const before = mine.get(site);
  if (before !== undefined) {
    globe.removeTerrainClip(
      before as Parameters<typeof globe.removeTerrainClip>[0],
    );
    mine.delete(site);
  }
  if (polygon === undefined) {
    return undefined;
  }
  try {
    mine.set(site, globe.addTerrainClip({ polygon }));
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Draws `globe`'s terrain everywhere again (the page is leaving). */
export function clearTerrainClips(globe: Tileset3D): void {
  for (const site of [...(added.get(globe)?.keys() ?? [])]) {
    syncTerrainClip(globe, site, undefined);
  }
}

// ------------------------------------------------------- see underground

/**
 * "See underground" (owner, 2026-11-08: "is it possible to use some
 * transparency to visualize the underground portions?"): the ground this
 * far either side of the corridor's centreline, ftUS, made translucent so
 * its tunnels show in place, as civil design tools show buried work. Wider
 * than the side slopes reach (332 ftUS), so a tunnel's hill reads around
 * it.
 */
export const UNDERGROUND_HALF_WIDTH = 500;

/** The ground's opacity there: the hill still reads; the road shows. */
export const UNDERGROUND_OPACITY = 0.3;

/**
 * The corridor's see-underground strip from station `from` to `to`: its
 * centreline ±`halfWidth` design units, a vertex each `step` along each
 * side and at both ends, through the reprojected placement. The edges are
 * chords: on the tightest curve (radius 3,000 ftUS) a 500 ftUS chord sags
 * 12 ftUS inside the inner side's line, which a translucency region can
 * take.
 */
export function undergroundRegion(
  alignment: Alignment,
  displayed: Displayed,
  halfWidth: number,
  step: number,
  from = alignment.startStation,
  to = alignment.endStation,
): ClipVertex[] {
  if (!(halfWidth > 0 && step > 0 && to > from)) {
    throw new RangeError(
      `undergroundRegion: needs a width, a step and from < to, got ${halfWidth}, ${step}, ${from} to ${to}`,
    );
  }
  const stations: number[] = [];
  const count = Math.ceil((to - from) / step);
  for (let i = 0; i <= count; i++) {
    stations.push(i === count ? to : from + i * step);
  }
  const side = (offset: number) =>
    stations.map((s) => geodeticOf(displayed(alignment.pointAt(s, offset))));
  return [...side(-halfWidth), ...side(halfWidth).reverse()];
}

/** The see-underground strips made now, by globe. */
const underground = new WeakMap<Tileset3D, unknown[]>();

/**
 * Makes `globe`'s terrain translucent inside `pieces` (or opaque again,
 * with none), at `opacity`, picks going through it to what shows under
 * it. Returns why the globe refused a piece, if it did; none is left then.
 */
export function syncUnderground(
  globe: Tileset3D,
  pieces: readonly (readonly ClipVertex[])[],
  opacity: number,
): string | undefined {
  for (const t of underground.get(globe) ?? []) {
    globe.removeTerrainTranslucency(
      t as Parameters<typeof globe.removeTerrainTranslucency>[0],
    );
  }
  underground.delete(globe);
  const made: unknown[] = [];
  try {
    for (const polygon of pieces) {
      made.push(
        globe.addTerrainTranslucency(
          { polygon },
          { opacity, pickThrough: true },
        ),
      );
    }
  } catch (error) {
    for (const t of made) {
      globe.removeTerrainTranslucency(
        t as Parameters<typeof globe.removeTerrainTranslucency>[0],
      );
    }
    return error instanceof Error ? error.message : String(error);
  }
  if (made.length > 0) {
    underground.set(globe, made);
  }
  return undefined;
}
