// The corridor's geometry for the design-globe generator (plan 4b Task 14):
// station sampling, the swept cross-section (shoulders, lanes, barriers), the
// bridge (deck and piers), the station ticks, and the tile tree of station
// ranges. Everything is in design coordinates (US survey feet, E, N, U),
// float64; the writer turns it into tile-relative float32.
import {
  BRIDGE,
  CROSS_SECTION,
  TICKS,
  sectionSurface,
} from "../../examples/design-globe/corridor.ts";

/** The most station spacing on a tangent, in design units. */
export const TANGENT_SPACING = 30;

/** How far the section reaches either side: the outer barriers' outer faces (41). */
export const SECTION_REACH = Math.max(
  ...CROSS_SECTION.barriers.map((b) => Math.abs(b.offset) + b.baseWidth / 2),
  ...CROSS_SECTION.strips.map((s) => Math.max(-s.from, s.to)),
);

/** Ticks sit this far above the surface, so they don't fight it for depth. */
const TICK_RAISE = 0.03;

/** The offsets a chord error is measured at: the centreline and both edges. */
const MEASURED_OFFSETS = [-SECTION_REACH, 0, SECTION_REACH];

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
 * chord error there (exact for an arc's sagitta and a parabola's).
 */
export function chordError(alignment, a, b) {
  const middle = (a + b) / 2;
  let worst = 0;
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
 * tangents. The alignment's joins and the bridge's ends within the range are
 * always included. On a curve the spacing starts from the element's largest
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
    BRIDGE.fromStation,
    BRIDGE.toStation,
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
 * Every other station, keeping the first, the last, the alignment's joins
 * and the bridge's ends: a parent tile's stations, decimated 2×.
 */
export function decimate(alignment, stations) {
  const kept = new Set([
    ...alignment.horizontalElements.map((e) => e.station),
    BRIDGE.fromStation,
    BRIDGE.toStation,
  ]);
  const last = stations.length - 1;
  return Float64Array.from(
    stations.filter((s, i) => i % 2 === 0 || i === last || kept.has(s)),
  );
}

/** A mesh in design coordinates, built a vertex and a triangle at a time. */
class MeshBuilder {
  design = [];
  normals = [];
  ids = [];
  indices = [];
  features = [];
  #byName = new Map();

  feature(name, kind) {
    let id = this.#byName.get(name);
    if (id === undefined) {
      id = this.features.length;
      if (id > 0xffff) {
        throw new Error("corridorMesh: more than 65,536 features in a tile");
      }
      this.features.push({ name, kind });
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
   * along `outward`.
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
    const flip = n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2] < 0;
    const length = Math.hypot(n[0], n[1], n[2]) * (flip ? -1 : 1);
    const normal = n.map((v) => v / length);
    const order = flip ? [p0, p3, p2, p1] : [p0, p1, p2, p3];
    const [a, b, c, d] = order.map((p) => this.vertex(p, normal, id));
    this.indices.push(a, b, c, a, c, d);
  }

  build() {
    return {
      design: Float64Array.from(this.design),
      normals: Float32Array.from(this.normals),
      indices: Uint32Array.from(this.indices),
      featureIds: Uint16Array.from(this.ids),
      features: this.features,
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
 * facing up). Each of its segments gets its own vertices, lit smoothly along
 * the alignment and sharply across it.
 */
function sweep(builder, alignment, stations, profile, id) {
  const segments = profile.length - 1;
  const rows = [];
  for (const station of stations) {
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
    const row = [];
    for (let j = 0; j < segments; j++) {
      const [o0, z0] = profile[j];
      const [o1, z1] = profile[j + 1];
      const across = [right[0] * (o1 - o0), right[1] * (o1 - o0), z1 - z0];
      const normal = normalize(cross(across, forward));
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
      builder.indices.push(a0, a1, b1, a0, b1, b0);
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
 * The corridor between `stations`' first and last, in design coordinates:
 * the strips and barriers swept along every station, the bridge's deck and
 * piers where they fall in the range, and a station tick every
 * `tickInterval` on each outer shoulder. A pier or tick belongs to the range
 * [first, last) (the last included only at the alignment's end), so adjacent
 * tiles don't both draw it.
 *
 * @returns {{ design: Float64Array, normals: Float32Array, indices: Uint32Array,
 *   featureIds: Uint16Array, features: { name: string, kind: string }[] }}
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

  // The bridge's deck: its underside 1.5 ft under the surface, its sides at
  // the section's edges, and its ends where the range reaches them.
  const thickness = BRIDGE.deckThickness;
  const deck = Array.from(stations).filter(
    (s) => s >= BRIDGE.fromStation && s <= BRIDGE.toStation,
  );
  if (deck.length >= 2) {
    const id = builder.feature("bridge deck", "deck");
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
      [BRIDGE.fromStation, -1],
      [BRIDGE.toStation, 1],
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

  // The piers: boxes from the deck's underside down to the profile − 25.
  const { width, depth, offsets, belowProfile } = BRIDGE.piers;
  for (const station of BRIDGE.piers.stations) {
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
        const p = sectionPoint(alignment, s, o, sectionSurface(o) - thickness);
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
        sectionPoint(alignment, s, o, sectionSurface(o) + TICK_RAISE);
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
 * top tile, with their stations decimated 2× (`decimate`) and a tick every
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
        stations: decimate(alignment, merged),
        tickInterval: TICKS.interval * 2 ** depth,
        children,
      });
    }
    level = next;
  }
  return level[0];
}
