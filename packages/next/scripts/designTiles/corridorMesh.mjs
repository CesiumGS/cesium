// The corridor's geometry for the design-globe generator (plan 4b Task 14):
// station sampling, the swept cross-section (shoulders, lanes, barriers), the
// side slopes on earthwork and the caps at its ends (abutments, portals), the
// viaducts (decks and piers), the station ticks, and the tile tree of station
// ranges. Everything is in design coordinates (US survey feet, E, N, U),
// float64; the writer turns it into tile-relative float32.
import {
  CROSS_SECTION,
  STRUCTURES,
  VIADUCTS,
  TICKS,
  sectionSurface,
} from "../../examples/design-globe/corridor.ts";
import {
  EARTHWORK,
  HINGE_RISE,
  SIDE_SLOPES,
  acrossAt,
  daylightBreaks,
  daylightRise,
  endGround,
  slopeSection,
} from "../../examples/design-globe/sideSlopes.ts";

/** The most station spacing on a tangent, in design units. */
export const TANGENT_SPACING = 30;

/** How far the section reaches either side: the outer barriers' outer faces (41). */
export const SECTION_REACH = Math.max(
  ...CROSS_SECTION.barriers.map((b) => Math.abs(b.offset) + b.baseWidth / 2),
  ...CROSS_SECTION.strips.map((s) => Math.max(-s.from, s.to)),
);

/** Every structure's ends (the viaducts' and the tunnels' portals). */
const STRUCTURE_ENDS = STRUCTURES.flatMap((s) => [s.fromStation, s.toStation]);

/** The offsets a chord error is measured at: the centreline and both edges. */
const MEASURED_OFFSETS = [-SECTION_REACH, 0, SECTION_REACH];

/**
 * Where the side slopes' sections change how they vary (sideSlopes.ts
 * `daylightBreaks`): kept as stations at the leaves, so that between two
 * of a leaf's stations a slope's run and rise are linear.
 */
const SLOPE_BREAKS = daylightBreaks();

/** sRGB hex to linear RGBA. */
function linear(hex) {
  const v = Number.parseInt(hex.slice(1), 16);
  const c = (x) => {
    const u = x / 255;
    return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
  };
  return [c((v >> 16) & 255), c((v >> 8) & 255), c(v & 255), 1];
}

/**
 * The corridor's colours, linear RGBA, as each vertex's COLOR_0 (the
 * material is white): the pavement, barriers, decks, piers and ticks in
 * the 0.45 grey the corridor's one material had; a side slope in soil a
 * grassed olive (sRGB #8a8f5c, a dry California hillside's grass); one in
 * rock a weathered sandstone (sRGB #8f8576); an abutment or a portal's
 * headwall a paler concrete (sRGB #b8b4aa); a tunnel's mouth near black
 * (sRGB #1c1c1e). The page tints them all by placement.
 */
export const CORRIDOR_PALETTE = {
  pavement: [0.45, 0.45, 0.43, 1],
  grass: linear("#8a8f5c"),
  rock: linear("#8f8576"),
  concrete: linear("#b8b4aa"),
  mouth: linear("#1c1c1e"),
};

/**
 * A portal's headwall (a tunnel's end of an earthwork stretch): the mouth
 * the full width of the paved section, its top `clearance` ftUS over the
 * profile; the wall over it at least `lintel` ftUS deep, and its top
 * `parapet` ftUS over the ground across the end (the upper hull of the
 * sampled ground, sideSlopes.ts `endGround`), so the hill doesn't show
 * over it.
 */
export const PORTAL = { clearance: 18, lintel: 3, parapet: 3 };

/**
 * An abutment (a viaduct's end of an earthwork stretch): a wall under the
 * deck and the fill's slopes down to `footing` ftUS under the ground
 * across the end (its lower hull), which the terrain hides.
 */
export const ABUTMENT = { footing: 5 };

/** The earthwork stretch holding [a, b], if one does. */
const earthworkOver = (a, b) =>
  EARTHWORK.find((r) => a >= r.fromStation && b <= r.toStation);

/**
 * A side slope at a station, outward from the paved section: its hinge,
 * the rock's top (the hinge where there's no rock) and its daylight line,
 * each [offset, rise above the profile]. Undefined off earthwork.
 */
function slopePoints(station, side) {
  const rise = daylightRise(station, side);
  if (rise === undefined) {
    return undefined;
  }
  const { rock, daylight } = slopeSection(rise);
  const h = SIDE_SLOPES.hinge;
  return [
    [side * h, HINGE_RISE],
    [side * (h + rock[0]), HINGE_RISE + rock[1]],
    [side * (h + daylight[0]), HINGE_RISE + daylight[1]],
  ];
}

/** Both slopes' rock tops and daylight points at a station, in design space. */
function slopeTrace(alignment, station) {
  const out = [];
  for (const side of [-1, 1]) {
    for (const [o, z] of slopePoints(station, side)?.slice(1) ?? []) {
      out.push(sectionPoint(alignment, station, o, z));
    }
  }
  return out;
}

const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/** "601+20": a station as engineers write it. */
export function stationLabel(station) {
  const hundreds = Math.floor(station / 100);
  const rest = station - hundreds * 100;
  const tail = Number.isInteger(rest)
    ? String(rest).padStart(2, "0")
    : rest.toFixed(2).padStart(5, "0");
  return `${hundreds}+${tail}`;
}

/**
 * The 3D distance, in design units, between the section's edges and
 * centreline at the middle of [a, b] and the middle of their chords: the
 * chord error there (exact for an arc's sagitta and a parabola's). On
 * earthwork, the side slopes' rock tops and daylight points too.
 */
export function chordError(alignment, a, b) {
  const middle = (a + b) / 2;
  let worst = 0;
  if (earthworkOver(a, b) !== undefined) {
    const [ta, tb, tm] = [a, b, middle].map((s) => slopeTrace(alignment, s));
    tm.forEach((pm, k) => {
      const chord = [0, 1, 2].map((i) => (ta[k][i] + tb[k][i]) / 2);
      worst = Math.max(worst, distance(pm, chord));
    });
  }
  for (const offset of MEASURED_OFFSETS) {
    const pa = alignment.pointAt(a, offset);
    const pb = alignment.pointAt(b, offset);
    const pm = alignment.pointAt(middle, offset);
    worst = Math.max(
      worst,
      Math.hypot(
        pm[0] - (pa[0] + pb[0]) / 2,
        pm[1] - (pa[1] + pb[1]) / 2,
        (pm[2] ?? 0) - ((pa[2] ?? 0) + (pb[2] ?? 0)) / 2,
      ),
    );
  }
  return worst;
}

/** The largest chord error of consecutive stations (`chordError`). */
export function largestChordError(alignment, stations) {
  let worst = 0;
  for (let i = 1; i < stations.length; i++) {
    worst = Math.max(
      worst,
      chordError(alignment, stations[i - 1], stations[i]),
    );
  }
  return worst;
}

/** The k-th of `pieces` equal steps from a to b (b itself at the last). */
const split = (a, b, pieces, k) =>
  k === pieces ? b : a + ((b - a) * k) / pieces;

/** Whether [a, b] cut in `pieces` equal steps has every chord within `tolerance`. */
function withinTolerance(alignment, a, b, pieces, tolerance) {
  for (let k = 1; k <= pieces; k++) {
    const error = chordError(
      alignment,
      split(a, b, pieces, k - 1),
      split(a, b, pieces, k),
    );
    if (!(error <= tolerance)) {
      return false;
    }
  }
  return true;
}

/**
 * Stations from `from` to `to` (both included) spaced so the chord error is
 * at most `chordTolerance` on curves, and at most TANGENT_SPACING apart on
 * tangents. The alignment's joins, the structures' ends and the side
 * slopes' breaks (`SLOPE_BREAKS`) within the range are always included. On a curve the spacing starts from the element's largest
 * curvature at the section's outer edge (its radius plus SECTION_REACH, where
 * a chord errs most), and each piece is then checked at its middle
 * (`chordError`, which also counts the profile's vertical curves) and split
 * further until it is within the tolerance.
 *
 * @param {import("../../src/engineering/alignment.ts").Alignment} alignment
 * @param {number} from
 * @param {number} to
 * @param {number} chordTolerance design units
 * @returns {Float64Array}
 */
export function sampleStations(alignment, from, to, chordTolerance) {
  if (
    !(from < to) ||
    from < alignment.startStation ||
    to > alignment.endStation
  ) {
    throw new RangeError(
      `sampleStations: [${from}, ${to}] is not a range within the alignment (${alignment.startStation} to ${alignment.endStation})`,
    );
  }
  if (!(chordTolerance > 0)) {
    throw new RangeError("sampleStations: the chord tolerance must be > 0");
  }
  const elements = alignment.horizontalElements;
  const breaks = new Set([from, to]);
  for (const station of [
    ...elements.map((e) => e.station),
    ...STRUCTURE_ENDS,
    ...SLOPE_BREAKS,
  ]) {
    if (station > from && station < to) {
      breaks.add(station);
    }
  }
  const sorted = [...breaks].sort((a, b) => a - b);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    // Breaks include every join, so [a, b] lies within one element.
    const middle = (a + b) / 2;
    let element = elements[0];
    for (const e of elements) {
      if (e.station <= middle) {
        element = e;
      }
    }
    const curvature = Math.max(
      Math.abs(element.startCurvature),
      Math.abs(element.endCurvature),
    );
    let step = TANGENT_SPACING;
    if (curvature > 0) {
      // A chord subtending θ errs by R(1 − cos(θ/2)) at radius R, so at the
      // outer edge (R + reach) θ = 2 acos(1 − tol/(R + reach)); the
      // centreline's arc length for that θ is θR.
      const radius = 1 / curvature;
      const theta =
        2 * Math.acos(1 - chordTolerance / (radius + SECTION_REACH));
      step = Math.min(step, theta * radius);
    }
    let pieces = Math.max(1, Math.ceil((b - a) / step - 1e-9));
    while (!withinTolerance(alignment, a, b, pieces, chordTolerance)) {
      pieces = Math.ceil(pieces * 1.05) + 1;
    }
    for (let k = 1; k <= pieces; k++) {
      out.push(split(a, b, pieces, k));
    }
  }
  return Float64Array.from(out);
}

/**
 * How far a parent tile `level` levels over the leaves may leave its side
 * slopes from its children's when it drops a station, design units:
 * SLOPE_TOLERANCE × 2^level (0.5 ftUS a level over the leaves, 32 ftUS at
 * the corridor's top tile, seven levels over them), so the errors stay in step with the rule
 * that a parent's is at least twice its children's. Where the ground
 * changes sharply between sections (a gully under a fill), the slopes'
 * runs jump, and a parent keeps the stations it needs there.
 */
export const SLOPE_TOLERANCE = 0.25;

/** The slopes' largest distance at `s` from their chord from `a` to `b`. */
function slopeMiss(alignment, a, s, b) {
  if (earthworkOver(a, b) === undefined) {
    return 0;
  }
  const t = (s - a) / (b - a);
  const [ta, ts, tb] = [a, s, b].map((x) => slopeTrace(alignment, x));
  let worst = 0;
  for (let q = 0; q < ts.length; q++) {
    const chord = [0, 1, 2].map((c) => ta[q][c] + (tb[q][c] - ta[q][c]) * t);
    worst = Math.max(worst, distance(ts[q], chord));
  }
  return worst;
}

/**
 * Every other station, keeping the first, the last, the alignment's joins
 * and the structures' ends, and a station whose dropping would move the
 * side slopes more than SLOPE_TOLERANCE × 2^`level`: a parent tile's
 * stations, decimated 2× where the slopes allow.
 */
export function decimate(alignment, stations, level = 1) {
  const kept = new Set([
    ...alignment.horizontalElements.map((e) => e.station),
    ...STRUCTURE_ENDS,
  ]);
  const last = stations.length - 1;
  const tolerance = SLOPE_TOLERANCE * 2 ** level;
  const out = [];
  stations.forEach((s, i) => {
    if (
      i % 2 === 0 ||
      i === last ||
      kept.has(s) ||
      slopeMiss(alignment, out[out.length - 1], s, stations[i + 1]) > tolerance
    ) {
      out.push(s);
    }
  });
  return Float64Array.from(out);
}

/** A mesh in design coordinates, built a vertex and a triangle at a time. */
class MeshBuilder {
  design = [];
  normals = [];
  ids = [];
  indices = [];
  features = [];
  #byName = new Map();
  #colors = [];

  /** A feature's id, by name; `color` (linear RGBA) colours its vertices. */
  feature(name, kind, color = CORRIDOR_PALETTE.pavement) {
    let id = this.#byName.get(name);
    if (id === undefined) {
      id = this.features.length;
      if (id > 0xffff) {
        throw new Error("corridorMesh: more than 65,536 features in a tile");
      }
      this.features.push({ name, kind });
      this.#colors.push(color);
      this.#byName.set(name, id);
    }
    return id;
  }

  vertex(p, n, id) {
    this.design.push(p[0], p[1], p[2]);
    this.normals.push(n[0], n[1], n[2]);
    this.ids.push(id);
    return this.ids.length - 1;
  }

  /**
   * A flat quad p0 p1 p2 p3 (in order around it), wound and lit to face
   * along `outward`; none if it has no area.
   */
  quad(corners, outward, id) {
    const [p0, p1, p2, p3] = corners;
    // Newell's normal of the polygon.
    const n = [0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    if (!(Math.hypot(n[0], n[1], n[2]) > 1e-9)) {
      return; // no area: nothing to draw
    }
    const flip = n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2] < 0;
    const length = Math.hypot(n[0], n[1], n[2]) * (flip ? -1 : 1);
    const normal = n.map((v) => v / length);
    const order = flip ? [p0, p3, p2, p1] : [p0, p1, p2, p3];
    const [a, b, c, d] = order.map((p) => this.vertex(p, normal, id));
    this.indices.push(a, b, c, a, c, d);
  }

  /** Twice the area of the triangle on vertices `t`, design units squared. */
  area([a, b, c]) {
    const p = this.design;
    const u = [0, 1, 2].map((k) => p[3 * b + k] - p[3 * a + k]);
    const v = [0, 1, 2].map((k) => p[3 * c + k] - p[3 * a + k]);
    return Math.hypot(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    );
  }

  build() {
    const colors = new Float32Array(this.ids.length * 4);
    this.ids.forEach((id, i) => colors.set(this.#colors[id], i * 4));
    return {
      design: Float64Array.from(this.design),
      normals: Float32Array.from(this.normals),
      indices: Uint32Array.from(this.indices),
      featureIds: Uint16Array.from(this.ids),
      features: this.features,
      colors,
    };
  }
}

const normalize = (v) => {
  const length = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** The profile's grade at a station (central difference, within the profile). */
function gradeAt(alignment, station) {
  const h = 0.5;
  const a = Math.max(alignment.startStation, station - h);
  const b = Math.min(alignment.endStation, station + h);
  return (alignment.elevationAt(b) - alignment.elevationAt(a)) / (b - a);
}

/** A point of the section at a station: `offset` right, `rise` above the profile. */
function sectionPoint(alignment, station, offset, rise) {
  const p = alignment.pointAt(station, offset);
  return [p[0], p[1], p[2] + rise];
}

/**
 * Sweeps a cross-section polyline along `stations`: `profile` is its points
 * as [offset, rise above the profile], in the order whose direction, crossed
 * with the direction of travel, points outward (left to right for a surface
 * facing up), or a function giving them at a station (the same count at
 * each). Each of its segments gets its own vertices, lit smoothly along
 * the alignment and sharply across it; a segment of no width at a station
 * (a slope with no rock there) takes its row's nearest lit neighbour's
 * normal, or up.
 */
function sweep(builder, alignment, stations, sections, id) {
  const at = typeof sections === "function" ? sections : () => sections;
  const segments = at(stations[0]).length - 1;
  const rows = [];
  for (const station of stations) {
    const profile = at(station);
    const azimuth = alignment.azimuthAt(station);
    const forward = [
      Math.sin(azimuth),
      Math.cos(azimuth),
      gradeAt(alignment, station),
    ];
    const right = [Math.cos(azimuth), -Math.sin(azimuth), 0];
    const points = profile.map(([offset, rise]) =>
      sectionPoint(alignment, station, offset, rise),
    );
    const lit = [];
    for (let j = 0; j < segments; j++) {
      const [o0, z0] = profile[j];
      const [o1, z1] = profile[j + 1];
      const across = [right[0] * (o1 - o0), right[1] * (o1 - o0), z1 - z0];
      const n = cross(across, forward);
      lit.push(Math.hypot(n[0], n[1], n[2]) > 1e-12 ? normalize(n) : undefined);
    }
    const row = [];
    for (let j = 0; j < segments; j++) {
      let normal = lit[j];
      for (let d = 1; normal === undefined && d < segments; d++) {
        normal = lit[j - d] ?? lit[j + d];
      }
      normal ??= [0, 0, 1];
      row.push(
        builder.vertex(points[j], normal, id),
        builder.vertex(points[j + 1], normal, id),
      );
    }
    rows.push(row);
  }
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    for (let j = 0; j < segments; j++) {
      const [a0, a1, b0, b1] = [a[2 * j], a[2 * j + 1], b[2 * j], b[2 * j + 1]];
      // A triangle with no area (a segment of no width at a station) isn't drawn.
      for (const t of [
        [a0, a1, b1],
        [a0, b1, b0],
      ]) {
        if (builder.area(t) > 1e-6) {
          builder.indices.push(...t);
        }
      }
    }
  }
}

/** The section's offsets where its surface changes slope, left to right. */
const BREAKS = [
  ...new Set(
    [
      ...CROSS_SECTION.strips.flatMap((s) => [s.from, s.to]),
      ...CROSS_SECTION.barriers.flatMap((b) => [
        b.offset - b.baseWidth / 2,
        b.offset + b.baseWidth / 2,
      ]),
    ].sort((a, b) => a - b),
  ),
];

/** Whether `station` belongs to the range [from, to), or ends the alignment. */
const owns = (alignment, from, to, station) =>
  station >= from &&
  (station < to || (station === to && to === alignment.endStation));

/**
 * An earthwork stretch's end at a structure, in the station plane, facing
 * the structure (`sign` +1 ahead, −1 behind): between the section's line
 * (the slopes and the pavement) and the ground. At a tunnel, a portal's
 * headwall up to over the ground (`PORTAL`), its mouth dark; at a viaduct,
 * an abutment under its deck and the fill's slopes down to under the
 * ground (`ABUTMENT`).
 */
function endCap(builder, alignment, station, sign, structure) {
  const left = slopePoints(station, -1);
  const right = slopePoints(station, 1);
  const ground = endGround(station);
  if (left === undefined || right === undefined || ground === undefined) {
    return;
  }
  // The section's line, left to right.
  const line = [
    left[2],
    left[1],
    ...BREAKS.map((o) => [o, sectionSurface(o)]),
    right[1],
    right[2],
  ].filter((p, i, all) => i === 0 || p[0] > all[i - 1][0]);
  const profile = alignment.elevationAt(station);
  const hull = structure.kind === "tunnel" ? ground.upper : ground.lower;
  // Strips between the section line's and the hull's breaks, each linear.
  const offsets = [
    ...new Set([
      ...line.map(([o]) => o),
      ...hull
        .map(([o]) => o)
        .filter((o) => o > line[0][0] && o < line[line.length - 1][0]),
    ]),
  ].sort((a, b) => a - b);
  const lineAt = (o) => acrossAt(line, o);
  const azimuth = alignment.azimuthAt(station);
  const outward = [sign * Math.sin(azimuth), sign * Math.cos(azimuth), 0];
  const at = (o, z) => sectionPoint(alignment, station, o, z);
  const label = stationLabel(station);
  const paved = (o0, o1) =>
    o0 >= -SECTION_REACH - 1e-9 && o1 <= SECTION_REACH + 1e-9;
  if (structure.kind === "tunnel") {
    const wall = builder.feature(
      `portal ${label} headwall`,
      "portal",
      CORRIDOR_PALETTE.concrete,
    );
    const mouth = builder.feature(
      `portal ${label} mouth`,
      "portal",
      CORRIDOR_PALETTE.mouth,
    );
    const lintel = PORTAL.clearance;
    // Over the ground's upper hull, and over the mouth by the lintel.
    const topAt = (o, over) =>
      Math.max(
        acrossAt(hull, o) - profile + PORTAL.parapet,
        over ? lintel + PORTAL.lintel : -Infinity,
      );
    for (let k = 1; k < offsets.length; k++) {
      const [o0, o1] = [offsets[k - 1], offsets[k]];
      const mouthed = paved(o0, o1);
      const [z0, z1] = [lineAt(o0), lineAt(o1)];
      const [t0, t1] = [topAt(o0, mouthed), topAt(o1, mouthed)];
      if (mouthed) {
        builder.quad(
          [at(o0, z0), at(o1, z1), at(o1, lintel), at(o0, lintel)],
          outward,
          mouth,
        );
      }
      const [b0, b1] = mouthed ? [lintel, lintel] : [z0, z1];
      builder.quad(
        [
          at(o0, Math.min(b0, t0)),
          at(o1, Math.min(b1, t1)),
          at(o1, t1),
          at(o0, t0),
        ],
        outward,
        wall,
      );
    }
    return;
  }
  const wall = builder.feature(
    `abutment ${label}`,
    "abutment",
    CORRIDOR_PALETTE.concrete,
  );
  for (let k = 1; k < offsets.length; k++) {
    const [o0, o1] = [offsets[k - 1], offsets[k]];
    // Under the deck, which has its own end face.
    const under = paved(o0, o1) ? structure.deckThickness : 0;
    const [f0, f1] = [o0, o1].map(
      (o) => acrossAt(hull, o) - profile - ABUTMENT.footing,
    );
    const [t0, t1] = [
      Math.max(lineAt(o0) - under, f0),
      Math.max(lineAt(o1) - under, f1),
    ];
    builder.quad(
      [at(o0, t0), at(o1, t1), at(o1, f1), at(o0, f0)],
      outward,
      wall,
    );
  }
}

/**
 * The largest distance, in design units, between the side slopes' rock
 * tops and daylight points at the `fine` stations (a parent tile's
 * leaves') and the chords between the `coarse` stations (its own) at the
 * same share of the way: what a parent's decimated slopes miss. Measured
 * at every leaf station, the side slopes' breaks among them, so it is
 * exact for the slopes' runs and rises (linear between the breaks); the
 * alignment's curves between leaf stations add at most the leaves' chord
 * tolerance.
 */
export function largestSlopeError(alignment, coarse, fine) {
  let worst = 0;
  let k = 0;
  for (let i = 1; i < coarse.length; i++) {
    const [a, b] = [coarse[i - 1], coarse[i]];
    while (k < fine.length && fine[k] <= a) {
      k++;
    }
    if (earthworkOver(a, b) === undefined) {
      continue;
    }
    const [ta, tb] = [slopeTrace(alignment, a), slopeTrace(alignment, b)];
    for (let j = k; j < fine.length && fine[j] < b; j++) {
      const t = (fine[j] - a) / (b - a);
      const trace = slopeTrace(alignment, fine[j]);
      for (let q = 0; q < trace.length; q++) {
        const chord = [0, 1, 2].map(
          (c) => ta[q][c] + (tb[q][c] - ta[q][c]) * t,
        );
        worst = Math.max(worst, distance(trace[q], chord));
      }
    }
  }
  return worst;
}

/**
 * The corridor between `stations`' first and last, in design coordinates:
 * the strips and barriers swept along every station, the side slopes on
 * earthwork and the caps at its ends (`endCap`), the viaducts' decks and
 * piers where they fall in the range, and a station tick every
 * `tickInterval` on each outer shoulder. A pier, cap or tick belongs to the range
 * [first, last) (the last included only at the alignment's end), so adjacent
 * tiles don't both draw it.
 *
 * @returns {{ design: Float64Array, normals: Float32Array, indices: Uint32Array,
 *   featureIds: Uint16Array, features: { name: string, kind: string }[],
 *   colors: Float32Array }} `colors` is each vertex's linear RGBA
 *   (`CORRIDOR_PALETTE`).
 */
export function corridorMesh(alignment, stations, options = {}) {
  const tickInterval = options.tickInterval ?? TICKS.interval;
  const builder = new MeshBuilder();
  const from = stations[0];
  const to = stations[stations.length - 1];

  for (const strip of CROSS_SECTION.strips) {
    sweep(
      builder,
      alignment,
      stations,
      [
        [strip.from, sectionSurface(strip.from)],
        [strip.to, sectionSurface(strip.to)],
      ],
      builder.feature(strip.name, strip.kind),
    );
  }
  for (const barrier of CROSS_SECTION.barriers) {
    const { offset, baseWidth, topWidth, height } = barrier;
    const base = sectionSurface(offset);
    sweep(
      builder,
      alignment,
      stations,
      [
        [offset - baseWidth / 2, base],
        [offset - topWidth / 2, base + height],
        [offset + topWidth / 2, base + height],
        [offset + baseWidth / 2, base],
      ],
      builder.feature(barrier.name, "barrier"),
    );
  }

  // The side slopes on earthwork: from each hinge, rock (where the cut is
  // deep enough to reach it) and then soil to the daylight line.
  for (const range of EARTHWORK) {
    const run = Array.from(stations).filter(
      (s) => s >= range.fromStation && s <= range.toStation,
    );
    if (run.length < 2 || daylightRise(run[0], 1) === undefined) {
      continue;
    }
    for (const side of [-1, 1]) {
      const name = side < 0 ? "left" : "right";
      // Left to right: outward on the left, inward on the right.
      const order = (a, b) => (side < 0 ? [b, a] : [a, b]);
      if (run.some((s) => daylightRise(s, side) > SIDE_SLOPES.soil)) {
        sweep(
          builder,
          alignment,
          run,
          (s) => {
            const p = slopePoints(s, side);
            return order(p[0], p[1]);
          },
          builder.feature(
            `${name} side slope, rock`,
            "side slope",
            CORRIDOR_PALETTE.rock,
          ),
        );
      }
      sweep(
        builder,
        alignment,
        run,
        (s) => {
          const p = slopePoints(s, side);
          return order(p[1], p[2]);
        },
        builder.feature(
          `${name} side slope`,
          "side slope",
          CORRIDOR_PALETTE.grass,
        ),
      );
    }
    // Its ends at a structure: an abutment or a portal's headwall.
    for (const [end, sign] of [
      [range.fromStation, -1],
      [range.toStation, 1],
    ]) {
      const structure = STRUCTURES.find((st) =>
        sign > 0 ? st.fromStation === end : st.toStation === end,
      );
      if (structure !== undefined && owns(alignment, from, to, end)) {
        endCap(builder, alignment, end, sign, structure);
      }
    }
  }

  // Each viaduct's deck and piers.
  for (const bridge of VIADUCTS) {
    // Its deck: its underside 1.5 ft under the surface, its sides at
    // the section's edges, and its ends where the range reaches them.
    const thickness = bridge.deckThickness;
    const deck = Array.from(stations).filter(
      (s) => s >= bridge.fromStation && s <= bridge.toStation,
    );
    if (deck.length >= 2) {
      const id = builder.feature(
        `viaduct ${stationLabel(bridge.fromStation)} to ${stationLabel(bridge.toStation)}`,
        "deck",
      );
      const reach = SECTION_REACH;
      const under = [...BREAKS]
        .reverse()
        .map((o) => [o, sectionSurface(o) - thickness]);
      sweep(builder, alignment, deck, under, id);
      const edge = sectionSurface(reach);
      sweep(
        builder,
        alignment,
        deck,
        [
          [reach, edge],
          [reach, edge - thickness],
        ],
        id,
      );
      const leftEdge = sectionSurface(-reach);
      sweep(
        builder,
        alignment,
        deck,
        [
          [-reach, leftEdge - thickness],
          [-reach, leftEdge],
        ],
        id,
      );
      for (const [end, sign] of [
        [bridge.fromStation, -1],
        [bridge.toStation, 1],
      ]) {
        if (deck[0] !== end && deck[deck.length - 1] !== end) {
          continue;
        }
        const azimuth = alignment.azimuthAt(end);
        const outward = [sign * Math.sin(azimuth), sign * Math.cos(azimuth), 0];
        for (let k = 1; k < BREAKS.length; k++) {
          const [o0, o1] = [BREAKS[k - 1], BREAKS[k]];
          const [s0, s1] = [sectionSurface(o0), sectionSurface(o1)];
          builder.quad(
            [
              sectionPoint(alignment, end, o0, s0),
              sectionPoint(alignment, end, o1, s1),
              sectionPoint(alignment, end, o1, s1 - thickness),
              sectionPoint(alignment, end, o0, s0 - thickness),
            ],
            outward,
            id,
          );
        }
      }
    }

    // Its piers: boxes from the deck's underside down to the profile less
    // its `belowProfile`.
    const { width, depth, offsets, belowProfile } = bridge.piers;
    for (const station of bridge.piers.stations) {
      if (!owns(alignment, from, to, station)) {
        continue;
      }
      const azimuth = alignment.azimuthAt(station);
      const forward = [Math.sin(azimuth), Math.cos(azimuth), 0];
      const right = [Math.cos(azimuth), -Math.sin(azimuth), 0];
      const bottom = alignment.elevationAt(station) - belowProfile;
      for (const offset of offsets) {
        const id = builder.feature(
          `pier ${stationLabel(station)} ${offset < 0 ? "left" : "right"}`,
          "pier",
        );
        const corner = (along, across, low) => {
          const s = station + (along * depth) / 2;
          const o = offset + (across * width) / 2;
          const p = sectionPoint(
            alignment,
            s,
            o,
            sectionSurface(o) - thickness,
          );
          return low ? [p[0], p[1], bottom] : p;
        };
        const face = (corners, outward) =>
          builder.quad(
            corners.map(([a, c, low]) => corner(a, c, low)),
            outward,
            id,
          );
        const back = forward.map((v) => -v);
        const left = right.map((v) => -v);
        face(
          [
            [-1, -1, false],
            [-1, 1, false],
            [-1, 1, true],
            [-1, -1, true],
          ],
          back,
        );
        face(
          [
            [1, -1, false],
            [1, 1, false],
            [1, 1, true],
            [1, -1, true],
          ],
          forward,
        );
        face(
          [
            [-1, -1, false],
            [1, -1, false],
            [1, -1, true],
            [-1, -1, true],
          ],
          left,
        );
        face(
          [
            [-1, 1, false],
            [1, 1, false],
            [1, 1, true],
            [-1, 1, true],
          ],
          right,
        );
        face(
          [
            [-1, -1, true],
            [1, -1, true],
            [1, 1, true],
            [-1, 1, true],
          ],
          [0, 0, -1],
        );
      }
    }
  }

  // Station ticks on the outer shoulders.
  const first = Math.ceil(from / tickInterval) * tickInterval;
  for (let station = first; station <= to; station += tickInterval) {
    if (!owns(alignment, from, to, station)) {
      continue;
    }
    const s0 = Math.max(alignment.startStation, station - TICKS.along / 2);
    const s1 = Math.min(alignment.endStation, station + TICKS.along / 2);
    for (const offset of TICKS.offsets) {
      const id = builder.feature(
        `tick ${stationLabel(station)} ${offset < 0 ? "left" : "right"}`,
        "tick",
      );
      const at = (s, o) =>
        sectionPoint(alignment, s, o, sectionSurface(o) + TICKS.raise);
      const o0 = offset - TICKS.across / 2;
      const o1 = offset + TICKS.across / 2;
      builder.quad(
        [at(s0, o0), at(s0, o1), at(s1, o1), at(s1, o0)],
        [0, 0, 1],
        id,
      );
    }
  }
  return builder.build();
}

/**
 * The corridor's tile tree: leaves of `leafLength` of station (the last one
 * takes the remainder, when under half a leaf), each sampled by
 * `sampleStations`; parents pair their children level by level up to one
 * top tile, with their stations decimated 2× where the side slopes allow
 * (`decimate`) and a tick every
 * `TICKS.interval` × 2^level. A node's `level` is 0 at the leaves.
 *
 * @returns {CorridorNode} the top tile
 * @typedef {{ id: string, level: number, from: number, to: number,
 *   stations: Float64Array, tickInterval: number, children: CorridorNode[] }} CorridorNode
 */
export function corridorTree(alignment, { leafLength, chordTolerance }) {
  const start = alignment.startStation;
  const end = alignment.endStation;
  const count = Math.max(1, Math.round((end - start) / leafLength));
  let level = [];
  for (let i = 0; i < count; i++) {
    const from = start + i * leafLength;
    const to = i === count - 1 ? end : start + (i + 1) * leafLength;
    level.push({
      id: `0-${i}`,
      level: 0,
      from,
      to,
      stations: sampleStations(alignment, from, to, chordTolerance),
      tickInterval: TICKS.interval,
      children: [],
    });
  }
  let depth = 0;
  while (level.length > 1) {
    depth++;
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const children = level.slice(i, i + 2);
      const merged = [];
      for (const child of children) {
        for (const s of child.stations) {
          if (merged.length === 0 || s > merged[merged.length - 1]) {
            merged.push(s);
          }
        }
      }
      next.push({
        id: `${depth}-${i / 2}`,
        level: depth,
        from: children[0].from,
        to: children[children.length - 1].to,
        stations: decimate(alignment, merged, depth),
        tickInterval: TICKS.interval * 2 ** depth,
        children,
      });
    }
    level = next;
  }
  return level[0];
}
