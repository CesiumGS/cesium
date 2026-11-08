// The corridor's side slopes: where the road is on earthwork, a slope from
// each edge of the paved section down to the ground (fill) or up to it
// (cut), ending at the daylight line, where it meets the ground. None on a
// viaduct (its piers reach the ground) or in a tunnel (the hill is over
// it); each earthwork stretch's end at a structure is capped (an abutment
// or a portal's headwall, scripts/designTiles/corridorMesh.mjs).
//
// The ground is USGS 3DEP's, sampled in cross-sections by
// scripts/corridorDaylight.mjs, which wrote each section's daylight rises
// (corridorDaylight.ts). Here are the slopes' rules and the sections
// between the samples, for the generator (the slopes' surfaces) and the
// page (the terrain clip along the daylight lines). Every length and height
// is in US survey feet.
//
// Erasable TypeScript only: the Node generator imports this file directly.
import { CORRIDOR_ALIGNMENT, STRUCTURES, sectionSurface } from "./corridor.ts";
import { DAYLIGHT, END_GROUND } from "./corridorDaylight.ts";

/**
 * The slopes' rules, as a highway designer would set them for a freeway in
 * these hills: 2H:1V in fill and in a soil cut; a cut deeper than 30 ftUS
 * is rock under its top 30 ftUS of soil, so from the shoulder it rises at
 * 1H:1V through the rock and then at 2H:1V through the soil to the
 * daylight line.
 */
export const SIDE_SLOPES = {
  /**
   * The slopes start at the paved section's edges: the outer barriers'
   * outer faces, ±41 ftUS, at the section's surface there.
   */
  hinge: 41,
  /** A fill slope's run per unit of drop. */
  fill: 2,
  /** A soil cut's run per unit of rise. */
  cut: 2,
  /** A rock cut's run per unit of rise. */
  rock: 1,
  /** The soil over the rock in a cut, ftUS: a cut deeper than this is rock under it. */
  soil: 30,
} as const;

/** The hinge's height relative to the profile (the section's surface at ±41). */
export const HINGE_RISE = sectionSurface(SIDE_SLOPES.hinge);

/** A stretch of the mainline on earthwork (between structures). */
export interface Earthwork {
  readonly fromStation: number;
  readonly toStation: number;
}

/** The mainline's end station. */
export const END_STATION =
  CORRIDOR_ALIGNMENT.startStation +
  CORRIDOR_ALIGNMENT.horizontal.reduce((sum, e) => sum + e.length, 0);

/** The mainline's stretches on earthwork, in order of station. */
export const EARTHWORK: readonly Earthwork[] = (() => {
  const out: Earthwork[] = [];
  let from = CORRIDOR_ALIGNMENT.startStation;
  for (const s of STRUCTURES) {
    if (s.fromStation > from) {
      out.push({ fromStation: from, toStation: s.fromStation });
    }
    from = Math.max(from, s.toStation);
  }
  if (END_STATION > from) {
    out.push({ fromStation: from, toStation: END_STATION });
  }
  return out;
})();

/** A side of the road: −1 left, 1 right of the direction of travel. */
export type Side = -1 | 1;

/**
 * A side slope's section from its hinge, as [run outward, rise] in ftUS:
 * the rock's top (the hinge itself where there's no rock) and the daylight
 * line. A rise is negative in fill.
 */
export interface SlopeSection {
  readonly rock: readonly [number, number];
  readonly daylight: readonly [number, number];
}

/** The slope that meets the ground `rise` ftUS above its hinge (below, in fill). */
export function slopeSection(rise: number): SlopeSection {
  if (!Number.isFinite(rise)) {
    throw new RangeError(`slopeSection: rise ${rise} is not a number`);
  }
  if (rise > SIDE_SLOPES.soil) {
    const rock = rise - SIDE_SLOPES.soil;
    return {
      rock: [rock * SIDE_SLOPES.rock, rock],
      daylight: [
        rock * SIDE_SLOPES.rock + SIDE_SLOPES.soil * SIDE_SLOPES.cut,
        rise,
      ],
    };
  }
  const run = Math.abs(rise) * (rise < 0 ? SIDE_SLOPES.fill : SIDE_SLOPES.cut);
  return { rock: [0, 0], daylight: [run, rise] };
}

/** One earthwork stretch's sections: stations and each side's rises. */
interface Sections {
  readonly range: Earthwork;
  readonly stations: Float64Array;
  readonly left: Float64Array;
  readonly right: Float64Array;
}

/** The daylight table, split by earthwork stretch (each from end to end). */
const SECTIONS: readonly Sections[] = EARTHWORK.flatMap((range) => {
  const rows = DAYLIGHT.filter(
    ([s]) => s >= range.fromStation && s <= range.toStation,
  );
  if (
    rows.length < 2 ||
    rows[0]![0] !== range.fromStation ||
    rows[rows.length - 1]![0] !== range.toStation
  ) {
    return [];
  }
  return [
    {
      range,
      stations: Float64Array.from(rows, (r) => r[0]),
      left: Float64Array.from(rows, (r) => r[1]),
      right: Float64Array.from(rows, (r) => r[2]),
    },
  ];
});

/** The sections of the earthwork stretch holding `station`, if any. */
function sectionsAt(station: number): Sections | undefined {
  for (const s of SECTIONS) {
    if (station >= s.range.fromStation && station <= s.range.toStation) {
      return s;
    }
  }
  return undefined;
}

/** Whether the daylight table covers every earthwork stretch. */
export const HAS_SLOPES = SECTIONS.length === EARTHWORK.length;

/**
 * Where `side`'s slope meets the ground at `station`, ftUS above its hinge
 * (negative in fill): the sampled sections' rises, linear between them.
 * Undefined off earthwork.
 */
export function daylightRise(station: number, side: Side): number | undefined {
  const s = sectionsAt(station);
  if (s === undefined) {
    return undefined;
  }
  const rises = side < 0 ? s.left : s.right;
  const at = s.stations;
  let lo = 0;
  let hi = at.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (at[mid]! <= station) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const t = (station - at[lo]!) / (at[hi]! - at[lo]!);
  return rises[lo]! + (rises[hi]! - rises[lo]!) * Math.min(1, Math.max(0, t));
}

/**
 * The stations where a slope's section changes how it varies: every
 * sampled section, and between them where a side's rise crosses level
 * (cut to fill) or the soil's depth (where the rock starts). Between two
 * of these a slope's run and rise are linear in station.
 */
export function daylightBreaks(): number[] {
  const out = new Set<number>();
  for (const s of SECTIONS) {
    for (let i = 0; i < s.stations.length; i++) {
      out.add(s.stations[i]!);
      if (i === 0) {
        continue;
      }
      for (const rises of [s.left, s.right]) {
        const [a, b] = [rises[i - 1]!, rises[i]!];
        for (const level of [0, SIDE_SLOPES.soil]) {
          if ((a - level) * (b - level) < 0) {
            const t = (level - a) / (b - a);
            out.add(
              s.stations[i - 1]! + (s.stations[i]! - s.stations[i - 1]!) * t,
            );
          }
        }
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * A side's daylight line along one earthwork stretch: [station, offset]
 * at every break (`daylightBreaks`) within it, the offset signed (negative
 * on the left). Exact: between breaks the offset is linear in station.
 */
export function daylightLine(
  range: Earthwork,
  side: Side,
  breaks: readonly number[] = daylightBreaks(),
): [number, number][] {
  return breaks
    .filter((s) => s >= range.fromStation && s <= range.toStation)
    .map((s) => [
      s,
      side *
        (SIDE_SLOPES.hinge +
          slopeSection(daylightRise(s, side) ?? 0).daylight[0]),
    ]);
}

/** A polyline across the road: [offset, height] from left to right, ftUS. */
export type Across = readonly (readonly [number, number])[];

/**
 * The ground across an earthwork stretch's end (`END_GROUND`), between the
 * daylight lines and under the road, NAVD88 ftUS: its upper and lower
 * convex hulls. Undefined at a station that isn't an end.
 */
export function endGround(
  station: number,
): { readonly upper: Across; readonly lower: Across } | undefined {
  const row = END_GROUND.find(([s]) => s === station);
  return row === undefined ? undefined : { upper: row[1], lower: row[2] };
}

/** A polyline across the road at `offset`: linear between its points, level past its ends. */
export function acrossAt(line: Across, offset: number): number {
  if (offset <= line[0]![0]) {
    return line[0]![1];
  }
  for (let i = 1; i < line.length; i++) {
    const [o1, h1] = line[i]!;
    if (offset <= o1) {
      const [o0, h0] = line[i - 1]!;
      return o1 === o0 ? h1 : h0 + ((h1 - h0) * (offset - o0)) / (o1 - o0);
    }
  }
  return line[line.length - 1]![1];
}
